// Musical intervals, in semitones. Columns are fixed Klais manual/pedal channels.
export const FOLLOWER_COLUMNS=[{label:'I',channel:1},{label:'II',channel:2},{label:'III',channel:3},{label:'IV',channel:4},{label:'P',channel:5}];
const positive=[['16',26],['13',21],['8',12],['7m',10],['5',7],['4',5],['3',4],['3m',3],['2',2]];
export const FOLLOWER_INTERVALS=[...positive.map(([name,semitones])=>({label:'+'+name,semitones})),{label:'0',semitones:0},...positive.toReversed().map(([name,semitones])=>({label:'−'+name,semitones:-semitones}))];
export const validFollowerSend=(offset,channel)=>FOLLOWER_INTERVALS.some(row=>row.semitones===offset)&&FOLLOWER_COLUMNS.some(column=>column.channel===channel);
