import { describe, expect, it } from "vitest";
import { rankByPurpose, scoreListing } from "./matching";
import type { Listing } from "./types";

const WORK = { lat: 37.5006, lng: 127.0364 }; // 역삼동

function listing(partial: Partial<Listing> & { id: string }): Listing {
  return {
    name: partial.id,
    district: "강남구",
    dong: "역삼동",
    address: "",
    location: { lat: 37.5, lng: 127.03 },
    propertyType: "apartment",
    dealType: "sale",
    price: 50000,
    areaM2: 84,
    rooms: 3,
    builtYear: 2010,
    floor: 5,
    tags: [],
    ...partial,
  };
}

describe("scoreListing", () => {
  it("출퇴근 목적: 가까운 집이 먼 집보다 높은 점수", () => {
    const near = listing({ id: "near", location: { lat: 37.5, lng: 127.035 } });
    const far = listing({ id: "far", location: { lat: 37.66, lng: 127.073 } });
    const ctx = { workLocation: WORK, currentAreaM2: 84 };
    expect(scoreListing(near, "commute", ctx).score).toBeGreaterThan(
      scoreListing(far, "commute", ctx).score,
    );
  });

  it("학군 목적: 학군 태그가 점수에 반영", () => {
    const ctx = { workLocation: WORK, currentAreaM2: 84 };
    const school = listing({ id: "s", tags: ["학군"] });
    const plain = listing({ id: "p" });
    expect(scoreListing(school, "school", ctx).score).toBeGreaterThan(
      scoreListing(plain, "school", ctx).score,
    );
  });

  it("넓은 집 목적: 지금보다 좁으면 감점", () => {
    const ctx = { workLocation: WORK, currentAreaM2: 84 };
    const bigger = listing({ id: "big", areaM2: 114 });
    const smaller = listing({ id: "small", areaM2: 59 });
    expect(scoreListing(bigger, "space", ctx).score).toBeGreaterThan(
      scoreListing(smaller, "space", ctx).score,
    );
  });

  it("점수는 0~100 범위", () => {
    const ctx = { workLocation: WORK, currentAreaM2: 84 };
    const l = listing({ id: "x", tags: ["학군", "초품아", "역세권", "한강뷰", "신축"] });
    const s = scoreListing(l, "invest", ctx);
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThanOrEqual(100);
  });
});

describe("rankByPurpose", () => {
  it("점수 내림차순으로 limit개 반환", () => {
    const ctx = { workLocation: WORK, currentAreaM2: 84 };
    const listings = [
      listing({ id: "a", tags: ["학군"] }),
      listing({ id: "b" }),
      listing({ id: "c", tags: ["학군", "초품아"] }),
    ];
    const ranked = rankByPurpose(listings, "school", ctx, 2);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].listing.id).toBe("c");
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
  });
});
