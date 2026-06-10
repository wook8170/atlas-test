import type { Listing } from "./types";

export type PriceBand = "lower" | "similar" | "higher";
export type AreaBand = "smaller" | "similar" | "larger";

export const PRICE_BAND_LABEL: Record<PriceBand, string> = {
  lower: "조금 낮은 가격",
  similar: "비슷한 가격",
  higher: "조금 높은 가격",
};

export const AREA_BAND_LABEL: Record<AreaBand, string> = {
  smaller: "더 작은 평수",
  similar: "비슷한 평수",
  larger: "더 넓은 평수",
};

export interface Range {
  min: number;
  max: number;
}

/** 기준가 대비 가격 밴드 범위 */
export function priceRange(basePrice: number, band: PriceBand): Range {
  switch (band) {
    case "lower":
      return { min: basePrice * 0.7, max: basePrice * 0.93 };
    case "similar":
      return { min: basePrice * 0.93, max: basePrice * 1.07 };
    case "higher":
      return { min: basePrice * 1.07, max: basePrice * 1.3 };
  }
}

/** 기준 면적 대비 평수 밴드 범위 (m²) */
export function areaRange(baseAreaM2: number, band: AreaBand): Range {
  switch (band) {
    case "smaller":
      return { min: baseAreaM2 * 0.55, max: baseAreaM2 * 0.9 };
    case "similar":
      return { min: baseAreaM2 * 0.9, max: baseAreaM2 * 1.1 };
    case "larger":
      return { min: baseAreaM2 * 1.1, max: baseAreaM2 * 1.6 };
  }
}

export function findByBands(
  listings: Listing[],
  basePrice: number,
  baseAreaM2: number,
  priceBand: PriceBand,
  areaBand: AreaBand,
): Listing[] {
  const p = priceRange(basePrice, priceBand);
  const a = areaRange(baseAreaM2, areaBand);
  return listings
    .filter(
      (l) =>
        l.price >= p.min && l.price <= p.max && l.areaM2 >= a.min && l.areaM2 <= a.max,
    )
    .sort(
      (x, y) =>
        Math.abs(x.price - basePrice) / basePrice -
        Math.abs(y.price - basePrice) / basePrice,
    );
}

/** 비슷한 가격대 매물 (가격 근접순) */
export function findSimilarPrice(listings: Listing[], basePrice: number, limit = 20): Listing[] {
  const p = priceRange(basePrice, "similar");
  return listings
    .filter((l) => l.price >= p.min && l.price <= p.max)
    .sort(
      (x, y) => Math.abs(x.price - basePrice) - Math.abs(y.price - basePrice),
    )
    .slice(0, limit);
}
