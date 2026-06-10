import { describe, expect, it } from "vitest";
import { MockGeocodeProvider } from "./geocode";
import { allListings, MockListingProvider } from "./listings";
import { MockLoanProvider } from "./loans";
import { MockPriceProvider } from "./price";

describe("목데이터 파이프라인", () => {
  it("매물이 충분히 생성되고 결정적이다", () => {
    const a = allListings();
    expect(a.length).toBeGreaterThan(300);
    expect(allListings()).toBe(a); // 캐시
    const types = new Set(a.map((l) => l.propertyType));
    expect(types).toEqual(new Set(["apartment", "officetel", "villa", "house"]));
    const deals = new Set(a.map((l) => l.dealType));
    expect(deals).toEqual(new Set(["sale", "jeonse", "monthly"]));
  });

  it("월세 매물은 월세 금액을 가진다", () => {
    const monthly = allListings().filter((l) => l.dealType === "monthly");
    expect(monthly.length).toBeGreaterThan(0);
    for (const l of monthly) {
      expect(l.monthlyRent).toBeGreaterThan(0);
    }
  });

  it("주소에서 동 이름을 찾아 지오코딩한다", async () => {
    const geo = new MockGeocodeProvider();
    const r = await geo.geocode("서울 노원구 중계동 123-4");
    expect(r.district).toBe("노원구");
    expect(r.location.lat).toBeCloseTo(37.6451, 2);
  });

  it("모르는 주소도 서울 내 좌표로 결정적 매핑", async () => {
    const geo = new MockGeocodeProvider();
    const a = await geo.geocode("부산 해운대구 우동");
    const b = await geo.geocode("부산 해운대구 우동");
    expect(a.location).toEqual(b.location);
    expect(a.location.lat).toBeGreaterThan(37.4);
    expect(a.location.lat).toBeLessThan(37.7);
  });

  it("시세 추정: 강남 아파트가 노원 아파트보다 비싸다", async () => {
    const price = new MockPriceProvider();
    const gangnam = await price.estimate({ lat: 37.5006, lng: 127.0364 }, "apartment", 84);
    const nowon = await price.estimate({ lat: 37.6451, lng: 127.0648 }, "apartment", 84);
    expect(gangnam.price).toBeGreaterThan(nowon.price);
    expect(gangnam.comparables.length).toBeGreaterThan(0);
  });

  it("매물 검색 필터가 동작한다", async () => {
    const provider = new MockListingProvider();
    const r = await provider.search({ dealTypes: ["jeonse"], propertyTypes: ["apartment"] });
    expect(r.length).toBeGreaterThan(0);
    for (const l of r) {
      expect(l.dealType).toBe("jeonse");
      expect(l.propertyType).toBe("apartment");
    }
  });

  it("거래 형태별 대출 상품 제공", async () => {
    const loans = new MockLoanProvider();
    expect((await loans.products("sale")).length).toBeGreaterThan(0);
    expect((await loans.products("jeonse")).length).toBeGreaterThan(0);
    expect((await loans.products("monthly")).length).toBeGreaterThan(0);
  });
});
