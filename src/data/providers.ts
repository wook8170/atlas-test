import type {
  DealType,
  GeoPoint,
  Listing,
  LoanProduct,
  PriceEstimate,
  PropertyType,
} from "../domain/types";

/**
 * 외부 데이터 어댑터 인터페이스.
 * 목 구현(src/data/mock)을 실제 API 구현으로 교체하면 된다.
 * - GeocodeProvider  → 카카오/네이버 주소 검색 API
 * - ListingProvider  → 국토교통부 실거래가 공개 API 등
 * - PriceProvider    → 시세 추정 (실거래가 기반)
 * - LoanProvider     → 은행 대출 상품 비교 API
 */
export interface GeocodeResult {
  address: string;
  location: GeoPoint;
  district: string;
}

export interface GeocodeProvider {
  geocode(address: string): Promise<GeocodeResult>;
}

export interface ListingQuery {
  dealTypes?: DealType[];
  propertyTypes?: PropertyType[];
}

export interface ListingProvider {
  search(query?: ListingQuery): Promise<Listing[]>;
}

export interface PriceProvider {
  estimate(
    location: GeoPoint,
    propertyType: PropertyType,
    areaM2: number,
  ): Promise<PriceEstimate>;
}

export interface LoanProvider {
  products(dealType: DealType): Promise<LoanProduct[]>;
}

export interface DataProviders {
  geocode: GeocodeProvider;
  listings: ListingProvider;
  price: PriceProvider;
  loans: LoanProvider;
}
