import {loadEnv} from 'vite';
import {WebSocket} from 'ws';
import {createApomixisRelay} from './apomixis-relay.mjs';
const loopback=address=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address);
// Opt-in broadcaster. This plugin never imports audio, MIDI, laser or transport code.
export function hylonLivePlugin(){
  let relay=null,upstream=null,retry=null,lastFrame=null,lastAt=0,on=false,opening=null;
  // Audience gestures from the public relay (VPS) and the local viewer, handed to the app with the next frame reply.
  const gestures=[],pushGesture=g=>{if(g?.kind==='release'&&typeof g.charge==='number'){gestures.push({kind:'release',charge:Math.max(0,Math.min(1,g.charge))});if(gestures.length>20)gestures.shift();}};
  let upstreamUrl=process.env.APOMIXIS_RELAY_URL||'',key=process.env.APOMIXIS_PUBLISH_KEY||'';
  function configurationError(){if(!upstreamUrl)return key?'Set APOMIXIS_RELAY_URL':'';if(key.length<32)return 'Set matching APOMIXIS_PUBLISH_KEY (32+ characters)';try{if(new URL(upstreamUrl).protocol!=='https:')return 'Public relay requires HTTPS';}catch{return 'Invalid public relay URL';}return '';}
  const upstreamState=()=>configurationError()||(!upstreamUrl?'Local viewer only':upstream?.readyState===WebSocket.OPEN?'Public relay connected':'Public relay reconnecting');
  function connect(){
    if(!on||!upstreamUrl||configurationError())return;
    try{const url=new URL(upstreamUrl);if(url.protocol!=='https:')throw new Error('Public relay requires HTTPS');url.protocol='wss:';url.pathname='/live/publish';url.search='';url.hash='';
      const ws=new WebSocket(url,{headers:{Authorization:`Bearer ${key}`},handshakeTimeout:5000});upstream=ws;
      ws.on('message',(data,binary)=>{if(binary||data.length>512)return;try{const m=JSON.parse(data.toString());if(m?.type==='gesture')pushGesture(m);}catch{}});
      ws.on('open',()=>{if(ws!==upstream||!on){ws.close();return;}if(lastFrame&&Date.now()-lastAt<2500)ws.send(lastFrame);});ws.on('error',()=>{});
      ws.on('close',()=>{if(ws===upstream){upstream=null;if(on)retry=setTimeout(connect,3000);}});
    }catch{if(on)retry=setTimeout(connect,5000);}
  }
  async function enable(){
    if(on)return;if(opening)return opening;
    opening=(async()=>{const next=createApomixisRelay({onGesture:pushGesture});try{await new Promise((resolve,reject)=>{next.server.once('error',reject);next.server.listen(4175,'127.0.0.1',resolve);});relay=next;on=true;connect();}catch(error){next.close();throw error;}})();
    try{await opening;}finally{opening=null;}
  }
  function disable(){on=false;clearTimeout(retry);upstream?.terminate();upstream=null;relay?.close();relay=null;lastFrame=null;lastAt=0;}
  return {name:'hylon-public-live',configResolved(config){const env=loadEnv(config.mode,config.envDir,'APOMIXIS_');upstreamUrl=env.APOMIXIS_RELAY_URL||upstreamUrl;key=env.APOMIXIS_PUBLISH_KEY||key;},configureServer(server){
    server.middlewares.use(async(req,res,next)=>{
      if(!req.url?.startsWith('/__apomixis/'))return next();
      const origin=req.headers.origin,host=req.headers.host;let sameOrigin=false;try{sameOrigin=new URL(origin).host===host;}catch{}
      if(req.method!=='POST'||!loopback(req.socket.remoteAddress)||!sameOrigin){res.writeHead(403).end();return;}
      res.setHeader('Content-Type','application/json');
      try{
        const route=req.url.slice('/__apomixis/'.length);
        if(route==='start')await enable();
        else if(route==='stop')disable();
        else if(route==='frame'){
          if(!on){res.writeHead(409).end('{}');return;}let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>32768){res.writeHead(413).end('{}');return;}}
          if(Date.now()-lastAt<150){res.writeHead(429).end('{}');return;}
          const frame=JSON.parse(body);if(!relay.accept(frame)){res.writeHead(400).end(JSON.stringify({error:'Invalid visual frame'}));return;}
          lastFrame=JSON.stringify(frame);lastAt=Date.now();if(upstream?.readyState===WebSocket.OPEN&&upstream.bufferedAmount<65536)upstream.send(lastFrame);
        }else if(route!=='status'){res.writeHead(404).end('{}');return;}
        res.end(JSON.stringify({on,status:upstreamState(),viewer:'http://127.0.0.1:4175/',gestures:gestures.splice(0)}));
      }catch(error){res.writeHead(503).end(JSON.stringify({error:error.message}));}
    });
    server.httpServer?.once('close',disable);
  }};
}
