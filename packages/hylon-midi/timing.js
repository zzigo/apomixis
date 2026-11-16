// Passive API-dispatch measurements, never hardware-arrival timestamps.
export function createMidiTiming(){
 let recording=false,prefix='',rows=[],truncated=0,startedAt=0;
 function record(event){if(!recording||!event.owner?.startsWith(prefix))return;if(rows.length>=50000){truncated++;return;}rows.push({...event});}
 const stats=values=>{if(!values.length)return {n:0,mean:null,p95:null,max:null};const sorted=[...values].sort((a,b)=>a-b);return {n:values.length,mean:values.reduce((a,b)=>a+b,0)/values.length,p95:sorted[Math.ceil(sorted.length*.95)-1],max:sorted.at(-1)};};
 function snapshot(){const ons=new Map(),gates=[];for(const r of rows){if(r.type==='on')ons.set(r.owner,r);if(r.type==='off'&&ons.has(r.owner)){const on=ons.get(r.owner);gates.push((r.actualMs-on.actualMs)-(r.targetMs-on.targetMs));}}return {kind:'api-dispatch-not-hardware-arrival',recording,startedAt,truncated,scheduled:rows.filter(r=>r.type==='scheduled').length,coalesced:rows.filter(r=>r.type==='coalesced').length,dropped:rows.filter(r=>r.type==='dropped').length,onLateMs:stats(rows.filter(r=>r.type==='on').map(r=>r.actualMs-r.targetMs)),offLateMs:stats(rows.filter(r=>r.type==='off').map(r=>r.actualMs-r.targetMs)),gateErrorMs:stats(gates),rows:rows.map(r=>({...r}))};}
 return {record,start(ownerPrefix,time){prefix=ownerPrefix;rows=[];truncated=0;startedAt=time;recording=true;},stop(){recording=false;},snapshot};
}
