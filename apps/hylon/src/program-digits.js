// Inline seven-segment display: no font download or dependency on installed fonts.
const segments={a:'M4 1H16L19 4 16 6H4L1 4Z',b:'M18 6L21 4 23 7V15L20 18 18 15Z',c:'M18 20L21 17 23 20V28L20 31 18 28Z',d:'M4 30H16L19 33 16 35H4L1 33Z',e:'M0 20L3 17 5 20V28L2 31 0 28Z',f:'M0 7L3 4 5 7V15L2 18 0 15Z',g:'M4 16H16L19 19 16 21H4L1 19Z'};
const digits=['abcdef','bc','abdeg','abcdg','bcfg','acdfg','acdefg','abc','abcdefg','abcdfg'];
export function programDigits(value,pad=2){
 const text=String(value).padStart(pad,'0');
 return `<svg viewBox="0 0 ${text.length*28+2} 36" width="${(text.length*28+2)*.6875}" height="27" aria-hidden="true"><g transform="translate(6 0) skewX(-8)">${[...text].map((digit,index)=>`<g transform="translate(${index*28} 0)">${Object.entries(segments).map(([key,path])=>`<path class="${digits[Number(digit)].includes(key)?'lit':'unlit'}" d="${path}"/>`).join('')}</g>`).join('')}</g></svg>`;
}
