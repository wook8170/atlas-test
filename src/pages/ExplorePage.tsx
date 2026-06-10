import { useEffect, useMemo, useState } from "react";
import { ListingCard } from "../components/ListingCard";
import { providers } from "../data";
import { formatMoney } from "../domain/format";
import { toPyeong } from "../domain/geo";
import {
  AREA_BAND_LABEL,
  PRICE_BAND_LABEL,
  areaRange,
  findByBands,
  priceRange,
} from "../domain/priceBands";
import type { AreaBand, PriceBand } from "../domain/priceBands";
import type { DealType, Listing } from "../domain/types";
import { DEAL_TYPE_LABEL } from "../domain/types";
import { useProfile } from "../state/ProfileContext";

export function ExplorePage() {
  const { profile } = useProfile();
  const [priceBand, setPriceBand] = useState<PriceBand>("similar");
  const [areaBand, setAreaBand] = useState<AreaBand>("similar");
  const [dealType, setDealType] = useState<DealType>("sale");
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    let cancelled = false;
    providers.listings.search({ dealTypes: [dealType] }).then((r) => {
      if (!cancelled) setListings(r);
    });
    return () => {
      cancelled = true;
    };
  }, [dealType]);

  const results = useMemo(() => {
    if (!profile) return [];
    return findByBands(
      listings,
      profile.estimatedPrice,
      profile.areaM2,
      priceBand,
      areaBand,
    ).slice(0, 15);
  }, [listings, profile, priceBand, areaBand]);

  if (!profile) return null;

  const p = priceRange(profile.estimatedPrice, priceBand);
  const a = areaRange(profile.areaM2, areaBand);

  return (
    <section>
      <h2>가격 × 평수 조합 탐색</h2>
      <p className="hint">
        내 집 시세 {formatMoney(profile.estimatedPrice)} ·{" "}
        {toPyeong(profile.areaM2).toFixed(0)}평 기준으로 조합을 골라보세요.
      </p>

      <div className="chips">
        {(Object.keys(PRICE_BAND_LABEL) as PriceBand[]).map((b) => (
          <button
            key={b}
            className={`chip ${priceBand === b ? "active" : ""}`}
            onClick={() => setPriceBand(b)}
          >
            {PRICE_BAND_LABEL[b]}
          </button>
        ))}
      </div>
      <div className="chips">
        {(Object.keys(AREA_BAND_LABEL) as AreaBand[]).map((b) => (
          <button
            key={b}
            className={`chip ${areaBand === b ? "active" : ""}`}
            onClick={() => setAreaBand(b)}
          >
            {AREA_BAND_LABEL[b]}
          </button>
        ))}
      </div>
      <div className="chips">
        {(Object.keys(DEAL_TYPE_LABEL) as DealType[]).map((d) => (
          <button
            key={d}
            className={`chip small ${dealType === d ? "active" : ""}`}
            onClick={() => setDealType(d)}
          >
            {DEAL_TYPE_LABEL[d]}
          </button>
        ))}
      </div>

      <p className="hint">
        {formatMoney(p.min)} ~ {formatMoney(p.max)} · {toPyeong(a.min).toFixed(0)}~
        {toPyeong(a.max).toFixed(0)}평 · {results.length}건
      </p>

      <div className="list">
        {results.map((l) => (
          <ListingCard key={l.id} listing={l} workLocation={profile.workLocation} />
        ))}
      </div>
    </section>
  );
}
