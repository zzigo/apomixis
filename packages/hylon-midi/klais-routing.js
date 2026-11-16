// Composer-specified fixed console mapping. Physical response is not yet tested here.
export const KLAIS_CHANNELS = Object.freeze({ go: 1, po: 2, re: 3, so: 4, pe: 5 });
// The pipes do not respond to key velocity: every note-on to the organ carries one fixed value.
// Scores, pods and the mixer no longer expose velocity for the organ.
export const ORGAN_VELOCITY = 100;
export const KLAIS_ROUTING_VERSION = 'klais-manuals-1-5-v1';
