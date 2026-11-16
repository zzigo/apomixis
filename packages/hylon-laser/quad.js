// Normalized convex four-corner mapping, TL / TR / BR / BL. No hardware authority.
export const identityQuad = () => [[0,0],[1,0],[1,1],[0,1]];
export function validateQuad(raw) {
  if (!Array.isArray(raw) || raw.length !== 4 || raw.some(p => !Array.isArray(p) || p.length !== 2 || p.some(v => !Number.isFinite(v) || v < 0 || v > 1))) throw new Error('Mapping corners must be four normalized XY pairs');
  let area = 0;
  for (let i=0;i<4;i++) {
    const a=raw[i],b=raw[(i+1)%4],c=raw[(i+2)%4];
    if ((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]) <= .0001) throw new Error('Mapping must stay convex; corners cannot cross');
    area += a[0]*b[1]-b[0]*a[1];
  }
  if (area < .02) throw new Error('Mapping area is too small');
  return raw.map(p=>[...p]);
}
export function createQuadMapper(raw) {
  const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=validateQuad(raw);
  const dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3;
  let g=0,h=0;
  if (Math.abs(dx3)+Math.abs(dy3)>1e-10) {
    const det=dx1*dy2-dx2*dy1;
    g=(dx3*dy2-dx2*dy3)/det; h=(dx1*dy3-dx3*dy1)/det;
  }
  if (Math.min(1,1+g,1+h,1+g+h)<=1e-8) throw new Error('Unstable mapping perspective');
  return (x,y) => {
    if (![x,y].every(v=>Number.isFinite(v)&&v>=0&&v<=1)) throw new Error('Invalid mapping input');
    const den=g*x+h*y+1;
    return [((x1-x0+g*x1)*x+(x3-x0+h*x3)*y+x0)/den,((y1-y0+g*y1)*x+(y3-y0+h*y3)*y+y0)/den].map(v=>Math.max(0,Math.min(1,v)));
  };
}
