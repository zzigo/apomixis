import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {timingSafeEqual} from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
import {validLiveFrame} from '../packages/hylon-visuals/live-frame.js';
const root=new URL('../',import.meta.url);
const assets=new Map([
  ...['index.html','viewer.js','garden.js','viewer.css','manifest.webmanifest','icon.svg'].map(f=>['/'+(f==='index.html'?'':f),'apps/apomixis/'+f]),
  ...['hylon-visuals/morphology.js','hylon-visuals/live-frame.js','spore/catalog.js','hylon-midi/divisions.js'].map(f=>['/packages/'+f,'packages/'+f])
]);
const mime={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',webmanifest:'application/manifest+json',svg:'image/svg+xml'};
function authorized(header,key){if(!key)return false;const a=Buffer.from(header||''),b=Buffer.from(`Bearer ${key}`);return a.length===b.length&&timingSafeEqual(a,b);}
export function createApomixisRelay({publishKey='',maxViewers=500,onGesture=null}={}){
  const peers=new Set();let publisher=null,latest=null,lastAt=0,live={piece:null,running:false};
  // Audience gestures (01 SPORE: hold and release). The only message a viewer may send. Limits:
  // one per viewer every 1.5 s, four per second for the whole hall, only while 01 is playing live.
  let bucketAt=0,bucket=0;
  function gesture(g){
    const t=Date.now();if(t-lastAt>2500||live.piece!==1||!live.running)return;
    if(t-bucketAt>=1000){bucketAt=t;bucket=0;}if(++bucket>4)return;
    const body=JSON.stringify({type:'gesture',...g});
    if(publisher?.readyState===WebSocket.OPEN&&publisher.bufferedAmount<65536)publisher.send(body);
    try{onGesture?.(g);}catch{}
  }
  const broadcast=body=>{for(const peer of peers)if(peer.readyState===WebSocket.OPEN&&peer.bufferedAmount<65536)peer.send(body);};
  const offline=()=>broadcast('{"type":"offline"}');
  function accept(frame){if(!validLiveFrame(frame))return false;live={piece:frame.garden?.piece??null,running:frame.running};latest=JSON.stringify(frame);lastAt=Date.now();broadcast(latest);return true;}
  const server=http.createServer(async(req,res)=>{
    const path=new URL(req.url,'http://local').pathname,asset=assets.get(path);
    if(req.method!=='GET'||!asset){res.writeHead(404).end();return;}
    try{const body=await readFile(new URL(asset,root));res.writeHead(200,{'Content-Type':mime[asset.split('.').at(-1)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'"});res.end(body);}catch{res.writeHead(503).end();}
  });
  const wss=new WebSocketServer({noServer:true,maxPayload:32768,perMessageDeflate:false});
  server.on('upgrade',(req,socket,head)=>{
    const path=new URL(req.url,'http://local').pathname;
    const publishing=path==='/live/publish'&&authorized(req.headers.authorization,publishKey)&&!publisher;
    const viewing=path==='/live/view'&&peers.size<maxViewers;
    if(!publishing&&!viewing){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
    wss.handleUpgrade(req,socket,head,ws=>{
      ws.alive=true;ws.on('error',()=>{});ws.on('pong',()=>{ws.alive=true;});
      if(publishing){publisher=ws;let windowAt=Date.now(),count=0;ws.on('message',(data,binary)=>{if(Date.now()-windowAt>=1000){windowAt=Date.now();count=0;}if(binary||++count>10){ws.close(1008,'Frame rate exceeded');return;}try{if(!accept(JSON.parse(data.toString())))ws.close(1008,'Invalid visual frame');}catch{ws.close(1008,'Invalid frame');}});ws.on('close',()=>{if(publisher===ws){publisher=null;lastAt=0;offline();}});}
      else{peers.add(ws);if(latest)ws.send(latest);if(Date.now()-lastAt>2500)ws.send('{"type":"offline"}');
        let lastGesture=0,strikes=0;
        ws.on('message',(data,binary)=>{
          if(binary||data.length>256){ws.close(1008,'Read only');return;}let m;try{m=JSON.parse(data.toString());}catch{ws.close(1008,'Invalid');return;}
          if(m?.type!=='gesture'||m.kind!=='release'||typeof m.charge!=='number'||!(m.charge>=0&&m.charge<=1)){ws.close(1008,'Read only');return;}
          const t=Date.now();if(t-lastGesture<1500){if(++strikes>20)ws.close(1008,'Too many gestures');return;}
          lastGesture=t;gesture({kind:'release',charge:Math.round(m.charge*100)/100});
        });ws.on('close',()=>peers.delete(ws));}
    });
  });
  let lastPing=0;const heartbeat=setInterval(()=>{if(Date.now()-lastPing>15000){lastPing=Date.now();for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}}if(Date.now()-lastAt>2500)offline();},1000);heartbeat.unref();
  return {server,accept,offline(){lastAt=0;offline();},close(){clearInterval(heartbeat);for(const ws of wss.clients)ws.terminate();wss.close();server.close();}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(!process.env.APOMIXIS_PUBLISH_KEY||process.env.APOMIXIS_PUBLISH_KEY.length<32)throw new Error('Set APOMIXIS_PUBLISH_KEY (32+ characters)');
  const relay=createApomixisRelay({publishKey:process.env.APOMIXIS_PUBLISH_KEY});
  relay.server.listen(Number(process.env.PORT||4175),process.env.HOST||'127.0.0.1',()=>console.log('APOMIXIS viewer relay listening'));
  // server.close() waits for open HTTP keep-alive sockets; exit shortly after closing so a restart is quick.
  for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{relay.close();relay.server.closeAllConnections?.();setTimeout(()=>process.exit(0),300).unref();});
}
