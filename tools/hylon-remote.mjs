import { sendSuperColliderPanic } from './hylon-sc-panic.mjs';
import { validParameter } from '../apps/hylon/remote/schema.js';
import { createOscBridge, OSC_IN, OSC_OUT } from './hylon-osc.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { randomBytes, randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';

const ACTIONS = new Set(['play','stop','hold','reset','speed','p2','super-panic','mixer','spore','process','ps','stop-all','score','program','impro']);
const loopback = address => ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address);
const send = (socket, data) => { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(data)); };
const assetRoot = new URL('../apps/hylon/remote/', import.meta.url);
const ASSETS = new Map([['/',['index.html','text/html; charset=utf-8']],['/remoto',['index.html','text/html; charset=utf-8']],['/remoto/',['index.html','text/html; charset=utf-8']],['/remote.js',['remote.js','text/javascript; charset=utf-8']],['/remote.css',['remote.css','text/css; charset=utf-8']],['/schema.js',['schema.js','text/javascript; charset=utf-8']],['/performance-knobs.js',['performance-knobs.js','text/javascript; charset=utf-8']],['/manifest.webmanifest',['manifest.webmanifest','application/manifest+json; charset=utf-8']],['/icon.svg',['icon.svg','image/svg+xml']],['/registers.css',['../src/registers.css','text/css; charset=utf-8']],['/load-meter.css',['../src/load-meter.css','text/css; charset=utf-8']]]);

// Separate LAN listener: never expose Vite's source tree, HMR, files or device APIs.
export function hylonRemotePlugin() {
  let session = null, opening = null;
  async function disable() {
    const old = session; session = null;
    if (!old) return;
    clearInterval(old.timer);
    for (const socket of old.wss.clients) socket.terminate();
    old.osc?.close();
    old.wss.close(); old.server.close();
  }
  async function enable() {
    if (session) return session;
    if (opening) return opening;
    opening = (async () => {
      const current = { createdAt: Date.now(), hostToken: randomBytes(24).toString('hex'), host: null, state: null, stateAt: 0, pending: new Map(), peers: new Set() };
      const server = http.createServer(async (req,res) => {
        const pathname = new URL(req.url,'http://local').pathname, asset = ASSETS.get(pathname);
        if (req.method !== 'GET' || !asset) { res.writeHead(404).end(); return; }
        try {
          const body = await readFile(new URL(asset[0],assetRoot));
          res.writeHead(200, {'Content-Type':asset[1], 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer', 'Content-Security-Policy':"default-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'"}); res.end(body);
        } catch { res.writeHead(503).end('Remote page unavailable'); }
      });
      const wss = new WebSocketServer({ noServer:true, maxPayload:131072, perMessageDeflate:false });
      Object.assign(current,{server,wss});
      server.on('upgrade',(req,socket,head) => {
        const url = new URL(req.url,'http://local'), role = url.searchParams.get('role'), token = url.searchParams.get('token');
        let validOrigin = false;
        try {
          const origin = new URL(req.headers.origin);
          validOrigin = role === 'host' ? ['localhost','127.0.0.1','[::1]'].includes(origin.hostname) && origin.port === '4173' : origin.host === req.headers.host;
        } catch {}
        const permitted = session === current && validOrigin && url.pathname === '/ws' && (role === 'host' ? loopback(req.socket.remoteAddress) && token === current.hostToken && !current.host : role === 'controller' && current.peers.size < 8);
        if (!permitted) { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return; }
        wss.handleUpgrade(req,socket,head,ws => wss.emit('connection',ws,req,role));
      });
      wss.on('connection',(socket,req,role) => {
        socket.alive = true; socket.on('pong',()=>{socket.alive=true;});
        const seen = new Set(); let ticks = [];
        if (role === 'host') current.host=socket;
        else { current.peers.add(socket); send(socket,{type:'state',state:current.state,online:!!current.host && Date.now()-current.stateAt<2000}); }
        socket.on('error',()=>{});
        socket.on('message',raw => {
          if(role==='controller'&&raw.length>1024){socket.close(1009);return;}
          let message; try { message=JSON.parse(raw.toString()); } catch { return; }
          if (role === 'host') {
            if (message.type === 'state' && message.state && typeof message.state === 'object') {
              current.state=message.state; current.stateAt=Date.now();
              try { current.osc?.push(message.state); } catch {}
              for (const peer of current.peers) send(peer,{type:'state',state:message.state,online:true});
            } else if (message.type === 'result') {
              const pending=current.pending.get(message.id); if (!pending) return;
              current.pending.delete(message.id); try { pending.onResult?.(message.ok===true,typeof message.error==='string'?message.error.slice(0,120):''); } catch {} send(pending.socket,{type:'result',id:pending.id,ok:message.ok===true,error:typeof message.error==='string'?message.error.slice(0,256):''});
            }
            return;
          }
          const reject = error => send(socket,{type:'result',id:message.id,ok:false,error});
          if (message.type!=='command'||typeof message.id!=='string'||message.id.length>96||!ACTIONS.has(message.action)) return;
          if (seen.has(message.id)) { reject('Command already received; not repeated'); return; }
          seen.add(message.id); if(seen.size>256)seen.delete(seen.values().next().value);
          ticks=ticks.filter(t=>t>Date.now()-1000); if(ticks.length>=40){reject('Too many commands');return;}ticks.push(Date.now());
          if (!current.host || current.host.readyState!==WebSocket.OPEN || Date.now()-current.stateAt>2000) { reject('Mac session unavailable; command not queued'); return; }
          if(message.action==='speed'&&![1,2,4,8,16].includes(message.value)){reject('Invalid speed');return;}
          if(['mixer','spore','process','impro'].includes(message.action)&&!validParameter(message.action,message.value)){reject('Invalid parameter');return;}
          if(message.action==='score'&&(typeof message.value!=='string'||message.value.length>128||!/^\d{2}-[A-Za-z0-9_-]+-score\.txt$/.test(message.value))){reject('Invalid score file');return;}
          if(message.action==='program'&&message.value!==-1&&message.value!==1){reject('Invalid program step');return;}
          const id=randomUUID(); current.pending.set(id,{socket,id:message.id,at:Date.now(),timeout:['p2','ps','super-panic'].includes(message.action)?120000:10000});
          send(current.host,{type:'command',id,action:message.action,value:message.value,expiresAt:Date.now()+1500});
        });
        socket.on('close',()=>{
          if(role==='host' && current.host===socket){current.host=null;if(session===current)void disable();}
          else current.peers.delete(socket);
          for(const [id,pending] of current.pending)if(pending.socket===socket)current.pending.delete(id);
        });
      });
      await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(4174,'0.0.0.0',resolve);});
      server.on('error',()=>{if(session===current)void disable();});
      session=current;
      // TouchOSC bridge (UDP in OSC_IN, feedback to the sender's IP on OSC_OUT): same commands, same validation.
      try { current.osc=createOscBridge({ state:()=>current.state, online:()=>!!current.host&&current.host.readyState===WebSocket.OPEN&&Date.now()-current.stateAt<2000,
        command:(action,value,onResult)=>{ const id=randomUUID(); current.pending.set(id,{socket:null,id,at:Date.now(),timeout:10000,onResult}); send(current.host,{type:'command',id,action,value,expiresAt:Date.now()+1500}); } }); } catch {}
      current.timer=setInterval(()=>{
        if(!current.host && Date.now()-current.createdAt>15000){if(session===current)void disable();return;}
        for(const socket of wss.clients){if(!socket.alive){socket.terminate();continue;}socket.alive=false;socket.ping();}
        for(const [id,pending] of current.pending)if(Date.now()-pending.at>pending.timeout){send(pending.socket,{type:'result',id:pending.id,ok:false,error:'Mac did not confirm completion; command not retried'});current.pending.delete(id);}
      },5000);
      return current;
    })().finally(()=>{opening=null;});
    return opening;
  }
  return {name:'hylon-remote',configureServer(vite){
    vite.httpServer?.once('close',()=>void disable());
    vite.middlewares.use(async (req,res,next)=>{
      if(!req.url?.startsWith('/__hylon_remote/'))return next();
      const local=loopback(req.socket.remoteAddress);
      let sameOrigin=false;try{sameOrigin=new URL(req.headers.origin).host===req.headers.host;}catch{}
      if(!local||!sameOrigin||req.method!=='POST'){res.writeHead(403).end();return;}
      res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
      try{
        if(req.url==='/__hylon_remote/sc-panic'){try{const result=await sendSuperColliderPanic();res.end(JSON.stringify(result));}catch(error){res.writeHead(503).end(JSON.stringify({ok:false,error:error.message}));}return;}
        if(req.url==='/__hylon_remote/disable'){await disable();res.end(JSON.stringify({enabled:false}));return;}
        if(req.url!=='/__hylon_remote/enable'){res.writeHead(404).end();return;}
        const current=await enable();
        const addresses=[...new Set(Object.values(networkInterfaces()).flat().filter(n=>n&&!n.internal&&n.family==='IPv4').map(n=>n.address))];
        res.end(JSON.stringify({enabled:true,osc:addresses.map(ip=>`${ip} · in ${OSC_IN} · out ${OSC_OUT}`),links:addresses.map(ip=>`http://${ip}:4174/remoto`),hostUrl:`ws://127.0.0.1:4174/ws?role=host&token=${current.hostToken}`}));
      }catch(error){res.writeHead(503).end(JSON.stringify({error:error.message}));}
    });
  }};
}
