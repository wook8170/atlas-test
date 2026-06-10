import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ListingCard } from "../components/ListingCard";
import { ResultsMap } from "../components/ResultsMap";
import { providers } from "../data";
import { formatArea, formatMoney } from "../domain/format";
import { findSimilarPrice } from "../domain/priceBands";
import type { Listing, PriceEstimate } from "../domain/types";
import { PROPERTY_TYPE_LABEL } from "../domain/types";
import { useProfile } from "../state/ProfileContext";

export function ValuePage() {
  const { profile } = useProfile();
  const [estimate, setEstimate] = useState<PriceEstimate | null>(null);
  const [similar, setSimilar] = useState<Listing[]>([]);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    (async () => {
      const est = await providers.price.estimate(
        profile.homeLocation,
        profile.propertyType,
        profile.areaM2,
      );
      const sales = await providers.listings.search({ dealTypes: ["sale"] });
      if (cancelled) return;
      setEstimate(est);
      setSimilar(findSimilarPrice(sales, est.price, 12));
    })();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (!profile) return null;
  if (!estimate) return <p className="hint">시세 조회 중…</p>;

  return (
    <section>
      <h2>내 집 시세</h2>
      <div className="estimate-box">
        <p className="meta">
          {profile.homeAddress} · {PROPERTY_TYPE_LABEL[profile.propertyType]} ·{" "}
          {formatArea(profile.areaM2)}
        </p>
        <p className="big-price">{formatMoney(estimate.price)}</p>
        <p className="meta">평당 약 {formatMoney(estimate.pricePerPyeong)}</p>
        <p className="hint">
          인근 동일 유형 매매 매물 {estimate.comparables.length}건의 평당가 기준 추정치입니다.
        </p>
      </div>

      <h2>비슷한 가격대 매물 ({similar.length}건)</h2>
      <p className="hint">
        내 집 시세 ±7% 범위의 매매 매물입니다.{" "}
        <Link to="/explore">가격·평수 조합으로 더 찾아보기 →</Link>
      </p>
      <ResultsMap listings={similar} profile={profile} />
      <div className="list">
        {similar.map((l) => (
          <ListingCard key={l.id} listing={l} workLocation={profile.workLocation} />
        ))}
      </div>
    </section>
  );
}
