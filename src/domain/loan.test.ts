import { describe, expect, it } from "vitest";
import {
  calcJeonseBudget,
  calcMonthlyRentBudget,
  calcSaleBudget,
  loanForPrice,
  maxPrincipalByDsr,
  monthlyPayment,
} from "./loan";
import type { LoanProduct } from "./types";

const saleProduct: LoanProduct = {
  id: "t-sale",
  bank: "테스트은행",
  name: "테스트 주담대",
  dealType: "sale",
  rate: 4,
  years: 30,
  maxLtv: 0.7,
  maxAmount: 100000,
  description: "",
};

const jeonseProduct: LoanProduct = {
  id: "t-jeonse",
  bank: "테스트은행",
  name: "테스트 전세대출",
  dealType: "jeonse",
  rate: 3.5,
  years: 2,
  maxLtv: 0.8,
  maxAmount: 30000,
  description: "",
};

describe("monthlyPayment", () => {
  it("4% 30년 1억(10000만)의 월 상환액은 약 47.7만", () => {
    const m = monthlyPayment(10000, 4, 30);
    expect(m).toBeGreaterThan(47);
    expect(m).toBeLessThan(48.5);
  });

  it("0% 금리는 단순 분할", () => {
    expect(monthlyPayment(12000, 0, 10)).toBeCloseTo(100);
  });
});

describe("maxPrincipalByDsr", () => {
  it("연소득 6000만, DSR 40% → 연 2400만 상환으로 빌릴 수 있는 원금", () => {
    const p = maxPrincipalByDsr(6000, 4, 30);
    // 월 200만 상환, 4% 30년 → 약 4.19억
    expect(p).toBeGreaterThan(40000);
    expect(p).toBeLessThan(43000);
  });

  it("소득이 0이면 한도 0", () => {
    expect(maxPrincipalByDsr(0, 4, 30)).toBe(0);
  });
});

describe("calcSaleBudget", () => {
  it("고소득 + 적정 자기자본이면 LTV가 결정 요인", () => {
    // 자기자본 3억(매도 4억 - 대출 2억 + 현금 1억), 고소득
    // → LTV 한도 가격 3억/0.3 = 10억, 필요 대출 7억 ≤ 상품한도 10억
    const r = calcSaleBudget(
      { annualIncome: 20000, cash: 10000, homeSalePrice: 40000, existingLoan: 20000 },
      saleProduct,
    );
    expect(r.equity).toBe(30000);
    expect(r.bindingFactor).toBe("ltv");
    expect(r.maxBudget).toBeGreaterThanOrEqual(99990);
    expect(r.maxBudget).toBeLessThanOrEqual(100000);
    expect(r.maxBudget).toBe(r.equity + r.loanLimit);
  });

  it("저소득이면 DSR이 결정 요인", () => {
    const r = calcSaleBudget(
      { annualIncome: 3000, cash: 5000, homeSalePrice: 30000, existingLoan: 0 },
      saleProduct,
    );
    expect(r.bindingFactor).toBe("dsr");
    expect(r.maxBudget).toBe(r.equity + r.dsrLimit);
  });

  it("기존 대출이 매도가를 넘으면 자기자본은 현금만", () => {
    const r = calcSaleBudget(
      { annualIncome: 5000, cash: 3000, homeSalePrice: 20000, existingLoan: 25000 },
      saleProduct,
    );
    expect(r.equity).toBe(3000);
  });
});

describe("calcJeonseBudget", () => {
  it("보증금의 80%까지 대출 반영", () => {
    const r = calcJeonseBudget(
      { annualIncome: 8000, cash: 10000, homeSalePrice: 0, existingLoan: 0 },
      jeonseProduct,
    );
    // 자기자본 1억 → ratio 결정이면 5억이지만 상품한도 3억에 걸림
    expect(r.maxBudget).toBe(r.equity + r.loanLimit);
    expect(r.loanLimit).toBeLessThanOrEqual(30000);
  });
});

describe("calcMonthlyRentBudget", () => {
  it("보증금은 자기자본 내, 월세는 월소득 30%", () => {
    const r = calcMonthlyRentBudget({
      annualIncome: 6000,
      cash: 5000,
      homeSalePrice: 30000,
      existingLoan: 10000,
    });
    expect(r.equity).toBe(25000);
    expect(r.maxDeposit).toBe(25000);
    expect(r.maxRent).toBe(150); // 6000 * 0.3 / 12
  });
});

describe("loanForPrice", () => {
  it("자기자본으로 충분하면 대출 0", () => {
    const r = loanForPrice(
      30000,
      { annualIncome: 5000, cash: 10000, homeSalePrice: 30000, existingLoan: 0 },
      saleProduct,
    );
    expect(r.loanNeeded).toBe(0);
    expect(r.affordable).toBe(true);
  });

  it("LTV 초과 대출이 필요하면 불가", () => {
    // 자기자본 1000만, 가격 10억 → 필요 대출 9.9억 > LTV 70%
    const r = loanForPrice(
      100000,
      { annualIncome: 10000, cash: 1000, homeSalePrice: 0, existingLoan: 0 },
      saleProduct,
    );
    expect(r.affordable).toBe(false);
  });
});
