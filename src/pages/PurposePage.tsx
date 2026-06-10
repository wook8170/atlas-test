import { useEffect, useMemo, useState } from "react";
import { ListingCard } from "../components/ListingCard";
import { providers } from "../data";
import { PURPOSES, rankByPurpose } from "../domain/matching";
import type { PurposeId, ScoredListing } from "../domain/matching";
import type { DealType, Listing } from "../domain/types";
import { DEAL_TYPE_LABEL } from "../domain/types";
import { useProfile } from "../state/ProfileContext";

export function PurposePage() {
  const { profile } = useProfile();
  const [purpose, setPurpose] = useState<PurposeId>("commute");
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

  const ranked: ScoredListing[] = useMemo(() => {
    if (!profile) return [];
    return rankByPurpose(listings, purpose, {
      workLocation: profile.workLocation,
      currentAreaM2: profile.areaM2,
    }, 12);
  }, [listings, purpose, profile]);

  if (!profile) return null;

  return (
    <section>
      <h2>목적에 맞는 집 찾기</h2>
      <p className="hint">이사하려는 목적을 고르면 거기에 맞는 집을 추천합니다.</p>

      <div className="chips">
        {PURPOSES.map((p) => (
          <button
            key={p.id}
            className={`chip ${purpose === p.id ? "active" : ""}`}
            onClick={() => setPurpose(p.id)}
            title={p.description}
          >
            {p.label}
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

      <p className="hint">{PURPOSES.find((p) => p.id === purpose)?.description}</p>

      <div className="list">
        {ranked.map(({ listing, score, reasons }) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            workLocation={profile.workLocation}
            footer={
              <p className="reasons">
                <strong>적합도 {score}점</strong>
                {reasons.length > 0 && <> — {reasons.join(", ")}</>}
              </p>
            }
          />
        ))}
      </div>
    </section>
  );
}
