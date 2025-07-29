// tools/homography.ts
export type H = number[][]; // 3 × 3

export function invert3x3(m: H): H {
  const [a,b,c,d,e,f,g,h,i] = m.flat();
  const A =   (e*i - f*h),
        B = - (d*i - f*g),
        C =   (d*h - e*g),
        D = - (b*i - c*h),
        E =   (a*i - c*g),
        F = - (a*h - b*g),
        G =   (b*f - c*e),
        Hn = - (a*f - c*d),
        I =   (a*e - b*d);
  const det = a*A + b*B + c*C;
  if (Math.abs(det) < 1e-12) throw new Error("Singular 3×3 matrix");
  return [
    [A/det, D/det, G/det],
    [B/det, E/det, Hn/det],
    [C/det, F/det, I/det],
  ];
}

export function applyH(x: number, y: number, H: H) {
  const w = H[2][0]*x + H[2][1]*y + H[2][2];
  const lng = (H[0][0]*x + H[0][1]*y + H[0][2]) / w;
  const lat = (H[1][0]*x + H[1][1]*y + H[1][2]) / w;
  return { lat, lng };
}