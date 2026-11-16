import {MIXER_DEFAULTS,validateMixerValue} from '../../../packages/hylon-audio/mixer.js';
import {createPitchFollower} from '../../../packages/hylon-audio/pitch-follower.js';
import {validFollowerSend} from '../../../packages/hylon-audio/follower-matrix.js';
export const MIXER_SNAPSHOTS_KEY='hylon-mixer-snapshots-v1';
export function validateMixerSnapshot(snapshot){
 if(snapshot?.kind!=='hylon-mixer-snapshot'||snapshot.version!==1)throw new Error('Invalid mixer snapshot');
 const values={};for(const key of Object.keys(MIXER_DEFAULTS))values[key]=validateMixerValue(key,snapshot.values?.[key]);
 const {master,micLane}=snapshot.values||{};if(!Number.isFinite(master)||master<0||master>1||![0,1].includes(micLane))throw new Error('Invalid mixer snapshot levels');Object.assign(values,{master,micLane});
 const check=createPitchFollower();check.configure(snapshot.follower?.params||{});const params={...check.params},routes={};for(const key of ['audio','klais','midi']){const value=snapshot.follower?.routes?.[key];if(typeof value!=='boolean')throw new Error('Invalid follower snapshot route');routes[key]=value;}
 const matrix=snapshot.follower?.matrix;if(!Array.isArray(matrix)||matrix.length>95||!matrix.every(key=>{if(typeof key!=='string')return false;const parts=key.split(':');return parts.length===2&&validFollowerSend(Number(parts[0]),Number(parts[1]));}))throw new Error('Invalid follower snapshot matrix');
 return {kind:'hylon-mixer-snapshot',version:1,values,follower:{params,routes,matrix:[...new Set(matrix)].sort()}};
}
