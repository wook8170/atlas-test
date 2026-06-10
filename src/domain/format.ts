import { toPyeong } from "./geo";

/** 만원 단위 금액을 "X억 Y만" 형식으로 */
export function formatMoney(manwon: number): string {
  const v = Math.round(manwon);
  if (v >= 10000) {
    const eok = Math.floor(v / 10000);
    const rest = v % 10000;
    return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만` : `${eok}억`;
  }
  return `${v.toLocaleString()}만원`;
}

export function formatArea(areaM2: number): string {
  return `${areaM2.toFixed(0)}m² (${toPyeong(areaM2).toFixed(1)}평)`;
}
