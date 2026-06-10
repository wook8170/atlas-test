import type { DataProviders } from "./providers";
import { MockGeocodeProvider } from "./mock/geocode";
import { MockListingProvider } from "./mock/listings";
import { MockLoanProvider } from "./mock/loans";
import { MockPriceProvider } from "./mock/price";

/**
 * 데이터 소스 진입점.
 * 실제 API 연동 시 이 객체의 구현만 교체하면 앱 전체가 전환된다.
 */
export const providers: DataProviders = {
  geocode: new MockGeocodeProvider(),
  listings: new MockListingProvider(),
  price: new MockPriceProvider(),
  loans: new MockLoanProvider(),
};
