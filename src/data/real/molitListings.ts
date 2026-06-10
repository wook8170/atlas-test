import type { DealType, Listing } from "../../domain/types";
import type { GeocodeProvider, ListingProvider, ListingQuery } from "../providers";

/** 서울 주요 구 법정동 코드 (LAWD_CD 앞 5자리) */
const LAWD_CODES: Record<string, string> = {
  강남구: "11680",
  서초구: "11650",
  송파구: "11710",
  마포구: "11440",
  성동구: "11200",
  영등포구: "11560",
  광진구: "11215",
  동작구: "11590",
  강서구: "11500",
  관악구: "11620",
  노원구: "11350",
  은평구: "11380",
};

function roomsFor(areaM2: number): number {
  if (areaM2 < 40) return 1;
  if (areaM2 < 60) return 2;
  if (areaM2 < 90) return 3;
  return 4;
}

/** 직전 달 YYYYMM */
function recentDealYmd(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function parseMoney(s: string | null): number {
  return s ? Number(s.replace(/[^\d]/g, "")) : 0;
}

function text(item: Element, tag: string): string | null {
  return item.querySelector(tag)?.textContent?.trim() ?? null;
}

/**
 * 국토교통부 아파트 실거래가 공개 API.
 * https://www.data.go.kr (공공데이터포털) 서비스 키 필요 (VITE_MOLIT_API_KEY).
 *
 * - 매매: RTMSDataSvcAptTradeDev / 전월세: RTMSDataSvcAptRent
 * - 응답이 XML이라 DOMParser로 파싱한다.
 * - 좌표가 없어 법정동 단위로 지오코딩해 매핑한다 (동 단위 캐시).
 * - 현재 아파트만 지원. 오피스텔(RTMSDataSvcOffiTrade 등)·연립다세대
 *   (RTMSDataSvcRHTrade 등)도 같은 패턴으로 확장하면 된다.
 */
export class MolitListingProvider implements ListingProvider {
  private cache: Listing[] | null = null;
  private geoCache = new Map<string, { lat: number; lng: number }>();

  constructor(
    private readonly serviceKey: string,
    private readonly geocoder: GeocodeProvider,
    private readonly districts: string[] = Object.keys(LAWD_CODES),
  ) {}

  async search(query?: ListingQuery): Promise<Listing[]> {
    if (!this.cache) {
      this.cache = await this.fetchAll();
    }
    let result = this.cache;
    if (query?.dealTypes?.length) {
      result = result.filter((l) => query.dealTypes!.includes(l.dealType));
    }
    if (query?.propertyTypes?.length) {
      result = result.filter((l) => query.propertyTypes!.includes(l.propertyType));
    }
    return result;
  }

  private async fetchAll(): Promise<Listing[]> {
    const ymd = recentDealYmd();
    const results = await Promise.allSettled(
      this.districts.flatMap((district) => [
        this.fetchDistrict(district, ymd, "trade"),
        this.fetchDistrict(district, ymd, "rent"),
      ]),
    );
    const listings = results
      .filter((r): r is PromiseFulfilledResult<Listing[]> => r.status === "fulfilled")
      .flatMap((r) => r.value);
    if (listings.length === 0) {
      const firstError = results.find((r) => r.status === "rejected") as
        | PromiseRejectedResult
        | undefined;
      throw new Error(
        `실거래가 조회 결과가 없습니다${firstError ? `: ${firstError.reason}` : ""}`,
      );
    }
    return listings;
  }

  private async fetchDistrict(
    district: string,
    dealYmd: string,
    kind: "trade" | "rent",
  ): Promise<Listing[]> {
    const lawdCd = LAWD_CODES[district];
    if (!lawdCd) return [];
    const base =
      kind === "trade"
        ? "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev"
        : "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent";
    const url = `${base}?serviceKey=${this.serviceKey}&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}&numOfRows=100&pageNo=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`실거래가 API 실패 (${district}): HTTP ${res.status}`);
    const xml = new DOMParser().parseFromString(await res.text(), "text/xml");
    const items = [...xml.querySelectorAll("item")];

    const listings: Listing[] = [];
    for (const [i, item] of items.entries()) {
      const dong = text(item, "umdNm") ?? "";
      const name = text(item, "aptNm") ?? "아파트";
      const areaM2 = Number(text(item, "excluUseAr") ?? 0);
      if (!dong || !areaM2) continue;

      const location = await this.geocodeDong(`서울 ${district} ${dong}`);
      if (!location) continue;

      let dealType: DealType;
      let price: number;
      let monthlyRent: number | undefined;
      if (kind === "trade") {
        dealType = "sale";
        price = parseMoney(text(item, "dealAmount"));
      } else {
        const rent = parseMoney(text(item, "monthlyRent"));
        price = parseMoney(text(item, "deposit"));
        dealType = rent > 0 ? "monthly" : "jeonse";
        monthlyRent = rent > 0 ? rent : undefined;
      }
      if (!price) continue;

      listings.push({
        id: `molit-${lawdCd}-${kind}-${i}`,
        name,
        district,
        dong,
        address: `서울 ${district} ${dong}`,
        location,
        propertyType: "apartment",
        dealType,
        price,
        monthlyRent,
        areaM2,
        rooms: roomsFor(areaM2),
        builtYear: Number(text(item, "buildYear") ?? 0) || 2000,
        floor: Number(text(item, "floor") ?? 0) || 1,
        tags: [],
      });
    }
    return listings;
  }

  private async geocodeDong(address: string) {
    const cached = this.geoCache.get(address);
    if (cached) return cached;
    try {
      const r = await this.geocoder.geocode(address);
      this.geoCache.set(address, r.location);
      return r.location;
    } catch {
      return null;
    }
  }
}
