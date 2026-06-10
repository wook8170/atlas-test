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

/** 지도 마커 등 좁은 공간용 축약 표기: 6.5억 / 4,500만 */
export function formatMoneyShort(manwon: number): string {
  if (manwon >= 10000) {
    const eok = manwon / 10000;
    return `${Number.isInteger(eok) ? eok : eok.toFixed(1)}억`;
  }
  return `${Math.round(manwon).toLocaleString()}만`;
}

export function formatArea(areaM2: number): string {
  return `${areaM2.toFixed(0)}m² (${toPyeong(areaM2).toFixed(1)}평)`;
}
