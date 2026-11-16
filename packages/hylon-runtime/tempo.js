// Shared score / audition tempo limits; event budgets remain independent.
export const MIN_BPM=12;
export const MAX_BPM=2400;
export const validBpm=value=>typeof value==='number'&&Number.isFinite(value)&&value>=MIN_BPM&&value<=MAX_BPM;
