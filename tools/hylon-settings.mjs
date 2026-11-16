// HYLON settings on disk (composer request 2026-11-14). The browser's localStorage holds workspaces,
// mixer snapshots, register programs, IMPRO patches, ATTACK profile, layout and the rest; a browser
// reset, another profile or a "clear site data on exit" setting loses all of it. This plugin keeps a
// copy in .local/hylon-settings.json (git-ignored) and injects it into index.html, so keys missing in
// the browser are restored before any pod reads them. Keys already in the browser are never overwritten.
import {readFileSync,writeFileSync,renameSync,mkdirSync,existsSync,readdirSync,unlinkSync,copyFileSync} from 'node:fs';
import {resolve} from 'node:path';
const DIR=resolve('.local'),FILE=resolve(DIR,'hylon-settings.json'),BACKUPS=resolve(DIR,'settings-backups'),MAX_BYTES=8*1024*1024;
const valid=data=>data&&typeof data==='object'&&data.items&&typeof data.items==='object'&&!Array.isArray(data.items)&&Object.entries(data.items).every(([k,v])=>/^hylon-[A-Za-z0-9:._-]{1,120}$/.test(k)&&typeof v==='string');
function read(){try{const data=JSON.parse(readFileSync(FILE,'utf8'));return valid(data)?data:null;}catch{return null;}}
let lastBackup=0;
function write(data){
  mkdirSync(DIR,{recursive:true});
  // Rolling copies: at most one every 10 minutes, the last 12 kept.
  if(existsSync(FILE)&&Date.now()-lastBackup>10*60e3){lastBackup=Date.now();mkdirSync(BACKUPS,{recursive:true});copyFileSync(FILE,resolve(BACKUPS,`hylon-settings-${new Date().toISOString().replace(/[:.]/g,'-')}.json`));
    const old=readdirSync(BACKUPS).filter(f=>f.endsWith('.json')).sort();for(const f of old.slice(0,Math.max(0,old.length-12)))try{unlinkSync(resolve(BACKUPS,f));}catch{}}
  const tmp=FILE+'.tmp';writeFileSync(tmp,JSON.stringify(data));renameSync(tmp,FILE);
}
const sameOrigin=req=>{const origin=req.headers.origin;if(!origin)return true;try{return new URL(origin).host===req.headers.host;}catch{return false;}};
export function hylonSettingsPlugin(){
  return{name:'hylon-settings',
    configureServer(server){server.middlewares.use((req,res,next)=>{
      if(!req.url?.startsWith('/__hylon/settings'))return next();
      const send=(code,body)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
      if(!sameOrigin(req))return send(403,{error:'Foreign origin'});
      if(req.method==='GET'){const data=read();return send(200,data?{savedAt:data.savedAt,keys:Object.keys(data.items).length}:{savedAt:null,keys:0});}
      if(req.method!=='POST')return send(405,{error:'GET or POST'});
      let size=0;const chunks=[];
      req.on('data',chunk=>{size+=chunk.length;if(size>MAX_BYTES){send(413,{error:'Too large'});req.destroy();}else chunks.push(chunk);});
      req.on('end',()=>{if(size>MAX_BYTES)return;try{const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!valid(data))return send(400,{error:'Invalid settings'});data.savedAt=new Date().toISOString();write(data);send(200,{savedAt:data.savedAt,keys:Object.keys(data.items).length});}catch(error){send(400,{error:error.message});}});
    });},
    transformIndexHtml(html,context){
      if(!context.server)return html;const data=read();if(!data)return html;
      const LS=String.fromCharCode(0x2028),PS=String.fromCharCode(0x2029),json=JSON.stringify(data.items).replace(/</g,'\\u003c').split(LS).join('\\u2028').split(PS).join('\\u2029');
      return{html,tags:[{tag:'script',injectTo:'head-prepend',children:`(function(){try{var s=${json},n=0;for(var k in s)if(localStorage.getItem(k)===null){localStorage.setItem(k,s[k]);n++;}window.__hylonSettingsRestored={keys:n,savedAt:${JSON.stringify(data.savedAt||null)}};}catch(e){window.__hylonSettingsRestored={error:String(e)};}})();`}]};
    }};
}
