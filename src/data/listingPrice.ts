import { distanceKm, toPyeong } from "../domain/geo";
import type { GeoPoint, PriceEstimate, PropertyType } from "../domain/types";
import type { ListingProvider, PriceProvider } from "./providers";

/**
 * 매물 소스(목/실거래가)와 무관하게, 인근 동일 유형 매매 매물의
 * 평당가 평균으로 시세를 추정한다.
 */
export class ListingBasedPriceProvider implements PriceProvider {
  constructor(private readonly listings: ListingProvider) {}

  async estimate(
    location: GeoPoint,
    propertyType: PropertyType,
    areaM2: number,
  ): Promise<PriceEstimate> {
    const sales = await this.listings.search({
      dealTypes: ["sale"],
      propertyTypes: [propertyType],
    });
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
