import type { DataProviders } from "./providers";
import { ListingBasedPriceProvider } from "./listingPrice";
import { MockGeocodeProvider } from "./mock/geocode";
import { MockListingProvider } from "./mock/listings";
import { MockLoanProvider } from "./mock/loans";
import { KakaoGeocodeProvider } from "./real/kakaoGeocode";
import { MolitListingProvider } from "./real/molitListings";

/**
 * 데이터 소스 진입점.
 *
 * .env(.env.local)에 API 키를 넣으면 실제 API로 자동 전환된다:
 * - VITE_KAKAO_REST_API_KEY → 카카오 주소 검색
 * - VITE_MOLIT_API_KEY      → 국토교통부 아파트 실거래가 (지오코더 필요)
 *
 * 키가 없으면 목데이터로 동작한다. .env.example 참고.
 */
const kakaoKey = import.meta.env.VITE_KAKAO_REST_API_KEY;
const molitKey = import.meta.env.VITE_MOLIT_API_KEY;

const geocode = kakaoKey ? new KakaoGeocodeProvider(kakaoKey) : new MockGeocodeProvider();
const listings =
  molitKey && kakaoKey
    ? new MolitListingProvider(molitKey, geocode)
    : new MockListingProvider();

export const providers: DataProviders = {
  geocode,
  listings,
  price: new ListingBasedPriceProvider(listings),
  loans: new MockLoanProvider(),
};

export const dataSourceLabel =
  molitKey && kakaoKey ? "국토부 실거래가 + 카카오 주소" : "데모 목데이터";
