export type PropertyType = "apartment" | "officetel" | "villa" | "house";
export type DealType = "sale" | "jeonse" | "monthly";

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** 모든 금액 단위는 만원 */
export interface Listing {
  id: string;
  name: string;
  district: string;
  dong: string;
  address: string;
  location: GeoPoint;
  propertyType: PropertyType;
  dealType: DealType;
  /** 매매가 또는 보증금 (만원) */
  price: number;
  /** 월세 (만원), monthly 전용 */
  monthlyRent?: number;
  /** 전용면적 (m²) */
  areaM2: number;
  rooms: number;
  builtYear: number;
  floor: number;
  tags: string[];
}

export interface UserProfile {
  homeAddress: string;
  homeLocation: GeoPoint;
  workAddress: string;
  workLocation: GeoPoint;
  propertyType: PropertyType;
  areaM2: number;
  /** 연소득 (만원) */
  annualIncome: number;
  /** 보유 현금 (만원) */
  cash: number;
  /** 기존 대출 잔액 (만원) */
  existingLoan: number;
  /** 추정된 내 집 시세 (만원) */
  estimatedPrice: number;
}

export interface PriceEstimate {
  /** 추정 시세 (만원) */
  price: number;
  /** 평당가 (만원/평) */
  pricePerPyeong: number;
  /** 추정에 사용된 인근 비교 매물 */
  comparables: Listing[];
}

export interface LoanProduct {
  id: string;
  bank: string;
  name: string;
  dealType: DealType;
  /** 연 이율 (%) */
  rate: number;
  /** 만기 (년) */
  years: number;
  /** LTV 상한 (0~1), 매매 대출용 */
  maxLtv: number;
  /** 대출 한도 (만원) */
  maxAmount: number;
  description: string;
}

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  apartment: "아파트",
  officetel: "오피스텔",
  villa: "빌라/다세대",
  house: "단독주택",
};

export const DEAL_TYPE_LABEL: Record<DealType, string> = {
  sale: "매매",
  jeonse: "전세",
  monthly: "월세",
};
