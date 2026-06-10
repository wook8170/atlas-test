import type { LoanProduct } from "./types";

/** 금액 단위: 만원 */
export interface FinanceInput {
  annualIncome: number;
  cash: number;
  /** 내 집 예상 매도가 */
  homeSalePrice: number;
  existingLoan: number;
}

export interface BudgetResult {
  /** 자기자본 = 매도가 - 기존대출 + 현금 */
  equity: number;
  /** DSR 기준 대출 한도 */
  dsrLimit: number;
  /** 실제 적용 대출 한도 */
  loanLimit: number;
  /** 최대 구매(또는 보증금) 가능 금액 */
  maxBudget: number;
  /** maxBudget 기준 월 상환액 */
  monthlyPayment: number;
  /** 한도를 결정한 요인 */
  bindingFactor: "ltv" | "dsr" | "cap";
}

export const DSR_CAP = 0.4;
/** 전세대출은 보증금의 80%까지가 일반적 */
export const JEONSE_LOAN_RATIO = 0.8;

/** 원리금균등 월 상환액 (원금, 연이율 %, 만기 년) */
export function monthlyPayment(principal: number, rate: number, years: number): number {
  if (principal <= 0) return 0;
  const r = rate / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - (1 + r) ** -n);
}

/** DSR 한도 내에서 빌릴 수 있는 최대 원금 */
export function maxPrincipalByDsr(
  annualIncome: number,
  rate: number,
  years: number,
  existingAnnualPayment = 0,
): number {
  const annualBudget = annualIncome * DSR_CAP - existingAnnualPayment;
  if (annualBudget <= 0) return 0;
  const m = annualBudget / 12;
  const r = rate / 100 / 12;
  const n = years * 12;
  if (r === 0) return m * n;
  return (m * (1 - (1 + r) ** -n)) / r;
}

/**
 * 매매: 자기자본 + min(LTV×가격, DSR한도, 상품한도)로 살 수 있는 최대 가격.
 * LTV가 가격에 비례하므로, LTV가 결정 요인이면 maxPrice = equity / (1 - ltv).
 */
export function calcSaleBudget(input: FinanceInput, product: LoanProduct): BudgetResult {
  const equity = Math.max(0, input.homeSalePrice - input.existingLoan) + input.cash;
  const dsrLimit = Math.floor(maxPrincipalByDsr(input.annualIncome, product.rate, product.years));
  const hardCap = Math.min(dsrLimit, product.maxAmount);

  let bindingFactor: BudgetResult["bindingFactor"];
  let maxBudget: number;
  if (product.maxLtv >= 1) {
    maxBudget = equity + hardCap;
    bindingFactor = dsrLimit <= product.maxAmount ? "dsr" : "cap";
  } else {
    const ltvBoundPrice = equity / (1 - product.maxLtv);
    const loanAtLtvBound = ltvBoundPrice * product.maxLtv;
    if (loanAtLtvBound <= hardCap) {
      maxBudget = ltvBoundPrice;
      bindingFactor = "ltv";
    } else {
      maxBudget = equity + hardCap;
      bindingFactor = dsrLimit <= product.maxAmount ? "dsr" : "cap";
    }
  }
  maxBudget = Math.floor(maxBudget);
  const loanLimit = Math.min(Math.floor(maxBudget - equity), hardCap);
  return {
    equity,
    dsrLimit,
    loanLimit: Math.max(0, loanLimit),
    maxBudget,
    monthlyPayment: Math.round(monthlyPayment(Math.max(0, loanLimit), product.rate, product.years)),
    bindingFactor,
  };
}

/** 전세: 자기자본 + min(보증금×80%, 상품한도, DSR한도) */
export function calcJeonseBudget(input: FinanceInput, product: LoanProduct): BudgetResult {
  const equity = Math.max(0, input.homeSalePrice - input.existingLoan) + input.cash;
  const dsrLimit = Math.floor(maxPrincipalByDsr(input.annualIncome, product.rate, product.years));
  const hardCap = Math.min(dsrLimit, product.maxAmount);

  // 보증금의 JEONSE_LOAN_RATIO까지 대출 가능 → ratio가 결정 요인이면
  // maxDeposit = equity / (1 - ratio)
  const ratioBoundDeposit = equity / (1 - JEONSE_LOAN_RATIO);
  const loanAtBound = ratioBoundDeposit * JEONSE_LOAN_RATIO;

  let bindingFactor: BudgetResult["bindingFactor"];
  let maxBudget: number;
  if (loanAtBound <= hardCap) {
    maxBudget = ratioBoundDeposit;
    bindingFactor = "ltv";
  } else {
    maxBudget = equity + hardCap;
    bindingFactor = dsrLimit <= product.maxAmount ? "dsr" : "cap";
  }
  maxBudget = Math.floor(maxBudget);
  const loanLimit = Math.max(0, Math.min(Math.floor(maxBudget - equity), hardCap));
  return {
    equity,
    dsrLimit,
    loanLimit,
    maxBudget,
    monthlyPayment: Math.round(monthlyPayment(loanLimit, product.rate, product.years)),
    bindingFactor,
  };
}

/** 특정 매물 가격에 대해 필요한 대출액과 월 상환액 */
export function loanForPrice(
  price: number,
  input: FinanceInput,
  product: LoanProduct,
): { loanNeeded: number; monthly: number; affordable: boolean } {
  const equity = Math.max(0, input.homeSalePrice - input.existingLoan) + input.cash;
  const loanNeeded = Math.max(0, price - equity);
  const ratioCap =
    product.dealType === "jeonse" ? price * JEONSE_LOAN_RATIO : price * product.maxLtv;
  const limit = Math.min(
    ratioCap,
    product.maxAmount,
    maxPrincipalByDsr(input.annualIncome, product.rate, product.years),
  );
  return {
    loanNeeded: Math.round(loanNeeded),
    monthly: Math.round(monthlyPayment(loanNeeded, product.rate, product.years)),
    affordable: loanNeeded <= limit,
  };
}
