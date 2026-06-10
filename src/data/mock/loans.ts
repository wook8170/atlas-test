import type { DealType, LoanProduct } from "../../domain/types";
import type { LoanProvider } from "../providers";

/** 금액 단위: 만원 */
const PRODUCTS: LoanProduct[] = [
  {
    id: "kb-home",
    bank: "KB국민은행",
    name: "KB 주택담보대출",
    dealType: "sale",
    rate: 3.9,
    years: 30,
    maxLtv: 0.7,
    maxAmount: 100000,
    description: "LTV 70%, 30년 원리금균등",
  },
  {
    id: "shinhan-home",
    bank: "신한은행",
    name: "신한 주택담보대출",
    dealType: "sale",
    rate: 4.1,
    years: 40,
    maxLtv: 0.7,
    maxAmount: 120000,
    description: "LTV 70%, 40년 만기로 월 상환 부담 완화",
  },
  {
    id: "didimdol",
    bank: "주택도시기금",
    name: "디딤돌 대출",
    dealType: "sale",
    rate: 2.7,
    years: 30,
    maxLtv: 0.7,
    maxAmount: 25000,
    description: "정책 대출 — 저금리, 한도 2.5억 (소득·주택가격 요건 있음)",
  },
  {
    id: "kakao-home",
    bank: "카카오뱅크",
    name: "카카오 주택담보대출",
    dealType: "sale",
    rate: 3.8,
    years: 35,
    maxLtv: 0.65,
    maxAmount: 100000,
    description: "비대면 신청, LTV 65%",
  },
  {
    id: "hug-jeonse",
    bank: "주택도시기금",
    name: "버팀목 전세자금대출",
    dealType: "jeonse",
    rate: 2.5,
    years: 2,
    maxLtv: 0.8,
    maxAmount: 12000,
    description: "정책 전세대출 — 저금리, 한도 1.2억",
  },
  {
    id: "kb-jeonse",
    bank: "KB국민은행",
    name: "KB 전세자금대출",
    dealType: "jeonse",
    rate: 3.6,
    years: 2,
    maxLtv: 0.8,
    maxAmount: 50000,
    description: "보증금의 80%까지, 한도 5억",
  },
  {
    id: "shinhan-jeonse",
    bank: "신한은행",
    name: "신한 전세자금대출",
    dealType: "jeonse",
    rate: 3.8,
    years: 2,
    maxLtv: 0.8,
    maxAmount: 50000,
    description: "보증금의 80%까지, 한도 5억",
  },
];

export class MockLoanProvider implements LoanProvider {
  async products(dealType: DealType): Promise<LoanProduct[]> {
    if (dealType === "monthly") {
      // 월세 보증금 대출은 전세대출 상품 준용
      return PRODUCTS.filter((p) => p.dealType === "jeonse");
    }
    return PRODUCTS.filter((p) => p.dealType === dealType);
  }
}
