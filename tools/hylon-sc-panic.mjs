import dgram from 'node:dgram';
import { randomUUID } from 'node:crypto';
const oscString = text => { const bytes=Buffer.from(text+'\0');return Buffer.concat([bytes,Buffer.alloc((4-bytes.length%4)%4)]); };
const packet = (path,...args) => Buffer.concat([oscString(path),oscString(','+'s'.repeat(args.length)),...args.map(oscString)]);
function strings(bytes){const values=[];let offset=0;while(offset<bytes.length){const end=bytes.indexOf(0,offset);if(end<0)throw new Error('Invalid OSC');values.push(bytes.toString('utf8',offset,end));offset=Math.ceil((end+1)/4)*4;}return values;}
let pending=null;
// Fixed localhost OSC message only: no code evaluation, shell or arbitrary OSC route.
export function sendSuperColliderPanic(){
 if(pending)return pending;
 const request=randomUUID(),socket=dgram.createSocket('udp4');
 pending=new Promise((resolve,reject)=>{
  let timer,started=false,finished=false;
  const finish=(error,result)=>{if(finished)return;finished=true;clearTimeout(timer);try{socket.close();}catch{}error?reject(error):resolve(result);};
  const timeout=ms=>{clearTimeout(timer);timer=setTimeout(()=>finish(new Error(started?'PS: SuperCollider did not report completion':'PS: bridge not running; evaluate tools/supercollider/HYLON-PANIC-BRIDGE.scd in SuperCollider')),ms);};
  socket.on('error',error=>finish(error));
  socket.on('message',(bytes,info)=>{
   if(info.address!=='127.0.0.1')return;
   let values;try{values=strings(bytes);}catch{return;}
   if(values[0]!=='/hylon/panic/ack'||values[2]!==request)return;
   const status=values[3];
   if(status==='started'){started=true;timeout(90000);}
   else if(status==='done')finish(null,{ok:true,message:values[4]||'SuperCollider panic completed'});
   else if(status==='error'||status==='busy')finish(new Error(values[4]||`PS ${status}`));
  });
  socket.bind(0,'127.0.0.1',()=>{timeout(2500);socket.send(packet('/hylon/panic',request),57132,'127.0.0.1',error=>{if(error)finish(error);});});
 }).finally(()=>{pending=null;});
 return pending;
}
