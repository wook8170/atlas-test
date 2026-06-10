import { commuteMinutes } from "./geo";
import type { GeoPoint, Listing } from "./types";

export type PurposeId =
  | "commute"
  | "school"
  | "newlywed"
  | "space"
  | "quiet"
  | "invest";

export interface Purpose {
  id: PurposeId;
  label: string;
  description: string;
}

export const PURPOSES: Purpose[] = [
  { id: "commute", label: "출퇴근 단축", description: "직장과 가까운 집을 우선합니다" },
  { id: "school", label: "학군·교육", description: "학군이 좋은 동네를 우선합니다" },
  { id: "newlywed", label: "신혼집", description: "방 2개 이상의 신축 위주로 찾습니다" },
  { id: "space", label: "더 넓은 집", description: "지금보다 넓은 평수를 우선합니다" },
  { id: "quiet", label: "조용한 주거환경", description: "공원 근처, 조용한 동네를 우선합니다" },
  { id: "invest", label: "투자 가치", description: "역세권·신축 등 가치 상승 요인을 봅니다" },
];

export interface MatchContext {
  workLocation: GeoPoint;
  currentAreaM2: number;
}

export interface ScoredListing {
  listing: Listing;
  score: number;
  reasons: string[];
  commuteMin: number;
}

/** 목적에 따라 매물을 0~100점으로 평가 */
export function scoreListing(
  listing: Listing,
  purpose: PurposeId,
  ctx: MatchContext,
): ScoredListing {
  const commuteMin = commuteMinutes(listing.location, ctx.workLocation);
  const reasons: string[] = [];
  let score = 50;

  // 통근은 모든 목적에서 기본 반영 (가까울수록 가산)
  const commuteScore = Math.max(0, 30 - commuteMin / 3);
  score += purpose === "commute" ? commuteScore * 2 : commuteScore * 0.5;
  if (commuteMin <= 30) reasons.push(`직장까지 약 ${commuteMin}분`);

  const has = (tag: string) => listing.tags.includes(tag);
  const isNew = listing.builtYear >= 2018;

  switch (purpose) {
    case "school":
      if (has("학군")) {
        score += 30;
        reasons.push("학군 우수 지역");
      }
      if (has("초품아")) {
        score += 15;
        reasons.push("단지 내 초등학교");
      }
      if (listing.rooms >= 3) score += 5;
      break;
    case "newlywed":
      if (listing.rooms >= 2) {
        score += 15;
        reasons.push(`방 ${listing.rooms}개`);
      } else {
        score -= 25;
      }
      if (isNew) {
        score += 15;
        reasons.push("신축");
      }
      if (has("역세권")) score += 10;
      break;
    case "space": {
      const gain = listing.areaM2 - ctx.currentAreaM2;
      if (gain > 0) {
        score += Math.min(35, gain * 1.2);
        reasons.push(`지금보다 ${gain.toFixed(0)}m² 넓음`);
      } else {
        score -= 30;
      }
      break;
    }
    case "quiet":
      if (has("조용한동네")) {
        score += 25;
        reasons.push("조용한 주거지역");
      }
      if (has("공원")) {
        score += 15;
        reasons.push("공원 인접");
      }
      if (has("상권")) score -= 10;
      break;
    case "invest":
      if (has("역세권")) {
        score += 20;
        reasons.push("역세권");
      }
      if (isNew) {
        score += 15;
        reasons.push("신축");
      }
      if (has("학군")) {
        score += 10;
        reasons.push("학군 수요");
      }
      if (has("한강뷰")) {
        score += 10;
        reasons.push("한강뷰");
      }
      break;
    case "commute":
      // 통근 점수는 위에서 이미 2배 반영
      break;
  }

  return { listing, score: Math.round(Math.max(0, Math.min(100, score))), reasons, commuteMin };
}

export function rankByPurpose(
  listings: Listing[],
  purpose: PurposeId,
  ctx: MatchContext,
  limit = 20,
): ScoredListing[] {
  return listings
    .map((l) => scoreListing(l, purpose, ctx))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
