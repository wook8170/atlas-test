import { useEffect, useMemo, useState } from "react";
import { ListingCard } from "../components/ListingCard";
import { providers } from "../data";
import { formatMoney } from "../domain/format";
import {
  calcJeonseBudget,
  calcMonthlyRentBudget,
  calcSaleBudget,
  loanForPrice,
} from "../domain/loan";
import type { FinanceInput } from "../domain/loan";
import { commuteMinutes } from "../domain/geo";
import type { DealType, Listing, LoanProduct } from "../domain/types";
import { useProfile } from "../state/ProfileContext";

export function BudgetPage() {
  const { profile } = useProfile();
  const [dealType, setDealType] = useState<DealType>("sale");
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      providers.loans.products(dealType),
      providers.listings.search({ dealTypes: [dealType] }),
    ]).then(([p, l]) => {
      if (cancelled) return;
      setProducts(p);
      setProductId((prev) => (p.some((x) => x.id === prev) ? prev : (p[0]?.id ?? "")));
      setListings(l);
    });
    return () => {
      cancelled = true;
    };
  }, [dealType]);

  const product = products.find((p) => p.id === productId);

  const finance: FinanceInput | null = useMemo(() => {
    if (!profile) return null;
    return {
      annualIncome: profile.annualIncome,
      cash: profile.cash,
      homeSalePrice: profile.estimatedPrice,
      existingLoan: profile.existingLoan,
    };
  }, [profile]);

  const budget = useMemo(() => {
    if (!finance || !product || dealType === "monthly") return null;
    return dealType === "sale"
      ? calcSaleBudget(finance, product)
      : calcJeonseBudget(finance, product);
  }, [finance, product, dealType]);

  const rentBudget = useMemo(() => {
    if (!finance || dealType !== "monthly") return null;
    return calcMonthlyRentBudget(finance);
  }, [finance, dealType]);

  const affordable = useMemo(() => {
    if (!finance || !profile) return [];
    if (dealType === "monthly") {
      if (!rentBudget) return [];
      return listings
        .filter(
          (l) => l.price <= rentBudget.maxDeposit && (l.monthlyRent ?? 0) <= rentBudget.maxRent,
        )
        .map((l) => ({ l, loan: null }))
        .sort(
          (a, b) =>
            commuteMinutes(a.l.location, profile.workLocation) -
            commuteMinutes(b.l.location, profile.workLocation),
        )
        .slice(0, 12);
    }
    if (!product || !budget) return [];
    return listings
      .filter((l) => l.price <= budget.maxBudget)
      .map((l) => ({ l, loan: loanForPrice(l.price, finance, product) }))
      .filter((x) => x.loan!.affordable)
      .sort(
        (a, b) =>
          commuteMinutes(a.l.location, profile.workLocation) -
          commuteMinutes(b.l.location, profile.workLocation),
      )
      .slice(0, 12);
  }, [listings, finance, product, budget, rentBudget, dealType, profile]);

  if (!profile) return null;

  const factorLabel =
    budget?.bindingFactor === "ltv"
      ? dealType === "sale"
        ? "LTV 70% 한도"
        : "보증금의 80% 한도"
      : budget?.bindingFactor === "dsr"
        ? "DSR 40% (소득 기준)"
        : "상품 대출 한도";

  return (
    <section>
      <h2>대출 고려해서 이사 갈 수 있는 집</h2>
      <div className="chips">
        <button
          className={`chip ${dealType === "sale" ? "active" : ""}`}
          onClick={() => setDealType("sale")}
        >
          매매
        </button>
        <button
          className={`chip ${dealType === "jeonse" ? "active" : ""}`}
          onClick={() => setDealType("jeonse")}
        >
          전세
        </button>
        <button
          className={`chip ${dealType === "monthly" ? "active" : ""}`}
          onClick={() => setDealType("monthly")}
        >
          월세
        </button>
      </div>

      {dealType !== "monthly" && (
        <label className="form">
          대출 상품 선택
          <select value={productId} onChange={(e) => setProductId(e.target.value)}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.bank} {p.name} — 연 {p.rate}% · {p.description}
              </option>
            ))}
          </select>
        </label>
      )}

      {rentBudget && (
        <div className="estimate-box">
          <p className="meta">
            자기자본 {formatMoney(rentBudget.equity)} 안에서 보증금을 내고, 월세는 월소득의
            30% 이내로 잡았습니다.
          </p>
          <p className="big-price">
            보증금 {formatMoney(rentBudget.maxDeposit)} · 월 {rentBudget.maxRent}만 이내
          </p>
        </div>
      )}

      {budget && product && (
        <div className="estimate-box">
          <p className="meta">
            자기자본 {formatMoney(budget.equity)} (내 집 시세{" "}
            {formatMoney(profile.estimatedPrice)} − 기존 대출{" "}
            {formatMoney(profile.existingLoan)} + 현금 {formatMoney(profile.cash)})
          </p>
          <p className="big-price">최대 {formatMoney(budget.maxBudget)}</p>
          <p className="meta">
            대출 {formatMoney(budget.loanLimit)} 활용 시 · 결정 요인: {factorLabel} · 월 상환 약{" "}
            {budget.monthlyPayment.toLocaleString()}만원
          </p>
        </div>
      )}

      <h2>예산 안에서 갈 수 있는 집 ({affordable.length}건)</h2>
      <p className="hint">통근 시간이 짧은 순으로 보여드립니다.</p>
      <div className="list">
        {affordable.map(({ l, loan }) => (
          <ListingCard
            key={l.id}
            listing={l}
            workLocation={profile.workLocation}
            footer={
              loan ? (
                <p className="reasons">
                  필요 대출 {formatMoney(loan.loanNeeded)}
                  {loan.loanNeeded > 0 && <> · 월 상환 약 {loan.monthly.toLocaleString()}만원</>}
                </p>
              ) : (
                <p className="reasons">
                  보증금 후 여유 자금{" "}
                  {formatMoney((rentBudget?.maxDeposit ?? 0) - l.price)}
                </p>
              )
            }
          />
        ))}
      </div>
    </section>
  );
}
