import { toPyeong } from "../../domain/geo";
import type { DealType, Listing, PropertyType } from "../../domain/types";
import type { ListingProvider, ListingQuery } from "../providers";
import { DISTRICTS } from "./districts";
import { mulberry32 } from "./seed";

const APT_BRANDS = ["래미안", "자이", "푸르지오", "힐스테이트", "e편한세상", "아이파크", "롯데캐슬", "더샵"];
const VILLA_SUFFIX = ["하임빌", "그린빌", "햇살빌", "코지하우스", "어반빌"];
const OFFICETEL_SUFFIX = ["센트럴타워", "스카이뷰", "리버타워", "스테이션", "퍼스트원"];

const TYPE_PRICE_MULTIPLIER: Record<PropertyType, number> = {
  apartment: 1,
  officetel: 0.72,
  villa: 0.55,
  house: 0.78,
};

const AREAS: Record<PropertyType, number[]> = {
  apartment: [49, 59, 74, 84, 101, 114],
  officetel: [23, 29, 36, 45],
  villa: [40, 49, 59, 69],
  house: [85, 110, 140, 165],
};

function roomsFor(areaM2: number): number {
  if (areaM2 < 40) return 1;
  if (areaM2 < 60) return 2;
  if (areaM2 < 90) return 3;
  return 4;
}

function nameFor(type: PropertyType, dong: string, rng: () => number, idx: number): string {
  switch (type) {
    case "apartment":
      return `${dong} ${APT_BRANDS[Math.floor(rng() * APT_BRANDS.length)]} ${idx + 1}단지`;
    case "officetel":
      return `${dong} ${OFFICETEL_SUFFIX[Math.floor(rng() * OFFICETEL_SUFFIX.length)]}`;
    case "villa":
      return `${dong} ${VILLA_SUFFIX[Math.floor(rng() * VILLA_SUFFIX.length)]}`;
    case "house":
      return `${dong} 단독주택`;
  }
}

/** 결정적으로 서울 12개 구의 매물 ~400건 생성 */
export function generateListings(): Listing[] {
  const rng = mulberry32(20260610);
  const listings: Listing[] = [];
  let id = 0;

  for (const d of DISTRICTS) {
    for (const dongSeed of d.dongs) {
      const types: PropertyType[] = ["apartment", "apartment", "apartment", "officetel", "villa", "villa", "house"];
      for (const type of types) {
        const count = 2 + Math.floor(rng() * 2); // 타입별 2~3건
        for (let i = 0; i < count; i++) {
          const areaOptions = AREAS[type];
          const areaM2 = areaOptions[Math.floor(rng() * areaOptions.length)];
          const builtYear = 1995 + Math.floor(rng() * 29); // 1995~2023
          const yearFactor = 0.82 + ((builtYear - 1995) / 28) * 0.3;
          const noise = 0.88 + rng() * 0.24;
          const salePrice = Math.round(
            (d.pricePerPyeong * toPyeong(areaM2) * TYPE_PRICE_MULTIPLIER[type] * yearFactor * noise) / 100,
          ) * 100;

          const dealRoll = rng();
          const dealType: DealType = dealRoll < 0.5 ? "sale" : dealRoll < 0.8 ? "jeonse" : "monthly";

          let price = salePrice;
          let monthlyRent: number | undefined;
          if (dealType === "jeonse") {
            price = Math.round((salePrice * (0.52 + rng() * 0.14)) / 100) * 100;
          } else if (dealType === "monthly") {
            const deposit = Math.round((salePrice * (0.05 + rng() * 0.1)) / 100) * 100;
            const jeonseEquiv = salePrice * 0.58;
            monthlyRent = Math.max(30, Math.round(((jeonseEquiv - deposit) * 0.055) / 12 / 5) * 5);
            price = deposit;
          }

          const tags = new Set<string>(d.tags);
          if (builtYear >= 2018) tags.add("신축");
          if (rng() < 0.4) tags.add("역세권");
          if (rng() < 0.2) tags.add("공원");
          if (rng() < 0.15 && type === "apartment") tags.add("초품아");
          if (rng() < 0.08 && ["잠실동", "반포동", "옥수동", "자양동", "여의도동"].includes(dongSeed.dong)) {
            tags.add("한강뷰");
          }
          if (rng() < 0.2) tags.add("조용한동네");

          listings.push({
            id: `L${++id}`,
            name: nameFor(type, dongSeed.dong, rng, i),
            district: d.district,
            dong: dongSeed.dong,
            address: `서울 ${d.district} ${dongSeed.dong} ${100 + Math.floor(rng() * 800)}`,
            location: {
              lat: dongSeed.lat + (rng() - 0.5) * 0.012,
              lng: dongSeed.lng + (rng() - 0.5) * 0.012,
            },
            propertyType: type,
            dealType,
            price,
            monthlyRent,
            areaM2,
            rooms: roomsFor(areaM2),
            builtYear,
            floor: 1 + Math.floor(rng() * (type === "apartment" ? 25 : type === "officetel" ? 18 : 4)),
            tags: [...tags],
          });
        }
      }
    }
  }
  return listings;
}

let cache: Listing[] | null = null;

export function allListings(): Listing[] {
  if (!cache) cache = generateListings();
  return cache;
}

export class MockListingProvider implements ListingProvider {
  async search(query?: ListingQuery): Promise<Listing[]> {
    let result = allListings();
    if (query?.dealTypes?.length) {
      result = result.filter((l) => query.dealTypes!.includes(l.dealType));
    }
    if (query?.propertyTypes?.length) {
      result = result.filter((l) => query.propertyTypes!.includes(l.propertyType));
    }
    return result;
  }
}
