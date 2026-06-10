import { distanceKm, toPyeong } from "../../domain/geo";
import type { GeoPoint, PriceEstimate, PropertyType } from "../../domain/types";
import type { PriceProvider } from "../providers";
import { allListings } from "./listings";

/**
 * 인근 동일 유형 매매 매물의 평당가 평균으로 시세를 추정하는 목 구현.
 * 실제 구현에서는 국토부 실거래가를 사용한다.
 */
export class MockPriceProvider implements PriceProvider {
  async estimate(
    location: GeoPoint,
    propertyType: PropertyType,
    areaM2: number,
  ): Promise<PriceEstimate> {
    const sales = allListings().filter(
      (l) => l.dealType === "sale" && l.propertyType === propertyType,
    );
    const nearby = sales
      .map((l) => ({ l, d: distanceKm(l.location, location) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 8);

    const comparables = nearby.map((n) => n.l);
    const avgPerPyeong =
      comparables.reduce((sum, l) => sum + l.price / toPyeong(l.areaM2), 0) /
      Math.max(1, comparables.length);

    const pricePerPyeong = Math.round(avgPerPyeong);
    const price = Math.round((pricePerPyeong * toPyeong(areaM2)) / 100) * 100;
    return { price, pricePerPyeong, comparables: comparables.slice(0, 5) };
  }
}
