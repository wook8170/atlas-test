import type { GeoPoint } from "./types";

const EARTH_RADIUS_KM = 6371;

export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** 대중교통 평균 속도 기준 통근 시간 추정 (분) */
export function commuteMinutes(from: GeoPoint, to: GeoPoint): number {
  const km = distanceKm(from, to);
  const AVG_TRANSIT_KMH = 22;
  const BASE_OVERHEAD_MIN = 8; // 도보·대기 시간
  return Math.round(BASE_OVERHEAD_MIN + (km / AVG_TRANSIT_KMH) * 60);
}

export const M2_PER_PYEONG = 3.3058;

export function toPyeong(areaM2: number): number {
  return areaM2 / M2_PER_PYEONG;
}

export function toM2(pyeong: number): number {
  return pyeong * M2_PER_PYEONG;
}
