import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MapView } from "../components/MapView";
import { providers } from "../data";
import { formatArea, formatMoney, formatMoneyShort } from "../domain/format";
import { commuteMinutes, distanceKm } from "../domain/geo";
import { loanForPrice } from "../domain/loan";
import type { FinanceInput } from "../domain/loan";
import type { Listing, LoanProduct } from "../domain/types";
import { DEAL_TYPE_LABEL, PROPERTY_TYPE_LABEL } from "../domain/types";
import { useProfile } from "../state/ProfileContext";

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [products, setProducts] = useState<LoanProduct[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await providers.listings.search();
      const found = all.find((l) => l.id === id) ?? null;
      if (cancelled) return;
      setListing(found);
      if (found) {
        setProducts(await providers.loans.products(found.dealType));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const finance: FinanceInput | null = useMemo(() => {
    if (!profile) return null;
    return {
      annualIncome: profile.annualIncome,
      cash: profile.cash,
      homeSalePrice: profile.estimatedPrice,
      existingLoan: profile.existingLoan,
    };
  }, [profile]);

  const loanOptions = useMemo(() => {
    if (!listing || !finance) return [];
    return products
      .map((p) => ({ product: p, loan: loanForPrice(listing.price, finance, p) }))
      .sort((a, b) => a.loan.monthly - b.loan.monthly);
  }, [listing, finance, products]);

  if (!listing) {
    return (
      <section>
        <p className="hint">매물을 찾을 수 없습니다.</p>
        <Link to="/value">← 시세 화면으로</Link>
      </section>
    );
  }

  const priceLabel =
    listing.dealType === "monthly"
      ? `보증금 ${formatMoney(listing.price)} / 월 ${listing.monthlyRent}만`
      : formatMoney(listing.price);

  const markers = [
    {
      location: listing.location,
      pill: listing.dealType === "monthly" ? `월 ${listing.monthlyRent}만` : formatMoneyShort(listing.price),
      detail: listing.name,
      variant: "listing" as const,
    },
    ...(profile
      ? [
          { location: profile.homeLocation, pill: "내 집", variant: "home" as const },
          { location: profile.workLocation, pill: "직장", variant: "work" as const },
        ]
      : []),
  ];

  return (
    <section>
      <button className="back" onClick={() => navigate(-1)}>
        ← 뒤로
      </button>
      <div className="card-head">
        <span className={`badge badge-${listing.dealType}`}>
          {DEAL_TYPE_LABEL[listing.dealType]}
        </span>
        <span className="badge badge-type">{PROPERTY_TYPE_LABEL[listing.propertyType]}</span>
        <h2 style={{ margin: "6px 0 0" }}>{listing.name}</h2>
      </div>
      <p className="big-price">{priceLabel}</p>
      <p className="meta">{listing.address}</p>

      <MapView markers={markers} />

      <div className="estimate-box">
        <p className="meta">전용면적 {formatArea(listing.areaM2)} · 방 {listing.rooms}개 · {listing.floor}층 · {listing.builtYear}년 준공</p>
        {profile && (
          <p className="meta">
            직장까지 약 {commuteMinutes(listing.location, profile.workLocation)}분 (
            {distanceKm(listing.location, profile.workLocation).toFixed(1)}km) · 지금 집에서{" "}
            {distanceKm(listing.location, profile.homeLocation).toFixed(1)}km
          </p>
        )}
        {listing.tags.length > 0 && (
          <p className="tags">
            {listing.tags.map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </p>
        )}
      </div>

      {profile && loanOptions.length > 0 && (
        <>
          <h2>이 집으로 이사한다면</h2>
          <p className="hint">
            자기자본 {formatMoney(Math.max(0, profile.estimatedPrice - profile.existingLoan) + profile.cash)}{" "}
            기준 대출 상품별 시뮬레이션입니다.
          </p>
          <div className="list">
            {loanOptions.map(({ product, loan }) => (
              <article key={product.id} className="card">
                <h3 style={{ margin: 0, fontSize: 15 }}>
                  {product.bank} {product.name}
                </h3>
                <p className="meta">
                  연 {product.rate}% · {product.description}
                </p>
                <p className="reasons">
                  {loan.affordable ? (
                    loan.loanNeeded === 0 ? (
                      <>✅ 대출 없이 가능</>
                    ) : (
                      <>
                        ✅ 필요 대출 {formatMoney(loan.loanNeeded)} · 월 상환 약{" "}
                        {loan.monthly.toLocaleString()}만원
                      </>
                    )
                  ) : (
                    <>❌ 이 상품으로는 한도 초과 (필요 대출 {formatMoney(loan.loanNeeded)})</>
                  )}
                </p>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
