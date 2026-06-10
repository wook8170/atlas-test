import { describe, expect, it } from "vitest";
import type { Listing } from "./types";
import { areaRange, findByBands, findSimilarPrice, priceRange } from "./priceBands";

function listing(id: string, price: number, areaM2: number): Listing {
  return {
    id,
    name: id,
    district: "강남구",
    dong: "역삼동",
    address: "",
    location: { lat: 37.5, lng: 127.03 },
    propertyType: "apartment",
    dealType: "sale",
    price,
    areaM2,
    rooms: 3,
    builtYear: 2015,
    floor: 5,
    tags: [],
  };
}

const LISTINGS = [
  listing("a", 50000, 84), // 기준과 동일
  listing("b", 45000, 84), // -10% → lower
  listing("c", 60000, 110), // +20% → higher, larger
  listing("d", 52000, 59), // similar price, smaller
  listing("e", 30000, 84), // -40% → 범위 밖
];

describe("priceRange / areaRange", () => {
  it("similar는 ±7%", () => {
    const r = priceRange(50000, "similar");
    expect(r.min).toBe(46500);
    expect(r.max).toBe(53500);
  });

  it("larger는 +10%~+60%", () => {
    const r = areaRange(84, "larger");
    expect(r.min).toBeCloseTo(92.4);
    expect(r.max).toBeCloseTo(134.4);
  });
});

describe("findByBands", () => {
  it("비슷한 가격 + 비슷한 평수", () => {
    const result = findByBands(LISTINGS, 50000, 84, "similar", "similar");
    expect(result.map((l) => l.id)).toEqual(["a"]);
  });

  it("조금 높은 가격 + 더 넓은 평수", () => {
    const result = findByBands(LISTINGS, 50000, 84, "higher", "larger");
    expect(result.map((l) => l.id)).toEqual(["c"]);
  });

  it("비슷한 가격 + 더 작은 평수", () => {
    const result = findByBands(LISTINGS, 50000, 84, "similar", "smaller");
    expect(result.map((l) => l.id)).toEqual(["d"]);
  });

  it("범위 밖 매물은 제외", () => {
    const result = findByBands(LISTINGS, 50000, 84, "lower", "similar");
    expect(result.map((l) => l.id)).toEqual(["b"]);
  });
});

describe("findSimilarPrice", () => {
  it("가격 근접순으로 정렬", () => {
    const result = findSimilarPrice(LISTINGS, 50000);
    expect(result.map((l) => l.id)).toEqual(["a", "d"]);
  });
});
