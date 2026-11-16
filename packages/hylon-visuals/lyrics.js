// Which `verse` line is current at score time t (pure). A section's verses share its duration:
// a `psalm` line gives the verse period in seconds; otherwise the section is divided evenly.
// Returns {now, prev, index, count}; prev is the last verse sung before `now` (may come from an
// earlier section). Text is capped for the public frame.
const cap=text=>String(text||'').slice(0,240);
export function lyricsAt(score,time){
 const empty={now:'',prev:'',index:-1,count:0};if(!score?.sections?.length||!Number.isFinite(time))return empty;
 const i=Math.max(0,score.sections.findLastIndex(s=>time>=s.start)),section=score.sections[i],verses=section.verses||[];
 const last=()=>{for(let j=i-1;j>=0;j--){const v=score.sections[j].verses;if(v?.length)return v.at(-1);}return'';};
 if(!verses.length)return{...empty,prev:cap(last())};
 if(section.verseTimes?.length===verses.length){const index=section.verseTimes.findLastIndex(t=>time>=t);if(index<0)return{...empty,prev:cap(last()),count:verses.length};return{now:cap(verses[index]),prev:cap(index>0?verses[index-1]:last()),index,count:verses.length};}
 const period=section.algos?.find(a=>a.kind==='psalm')?.params.verse||section.dur/verses.length;
 const index=Math.max(0,Math.min(verses.length-1,Math.floor((time-section.start)/period)));
 return{now:cap(verses[index]),prev:cap(index>0?verses[index-1]:last()),index,count:verses.length};
}
