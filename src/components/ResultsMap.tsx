import { useMemo, useState } from "react";
import { MapView } from "./MapView";
import type { MapMarker } from "./MapView";
import { formatMoneyShort } from "../domain/format";
import type { Listing, UserProfile } from "../domain/types";

interface Props {
  listings: Listing[];
  profile: UserProfile;
}

function pillFor(l: Listing): string {
  if (l.dealType === "monthly") return `월 ${l.monthlyRent}만`;
  return formatMoneyShort(l.price);
}

/** 검색 결과 매물들을 지도에 표시. 접고 펼 수 있다. */
export function ResultsMap({ listings, profile }: Props) {
  const [open, setOpen] = useState(true);

  const markers: MapMarker[] = useMemo(
    () => [
      ...listings.slice(0, 30).map((l) => ({
        location: l.location,
        pill: pillFor(l),
        detail: l.name,
        variant: "listing" as const,
      })),
      { location: profile.homeLocation, pill: "내 집", variant: "home" as const },
      { location: profile.workLocation, pill: "직장", variant: "work" as const },
    ],
    [listings, profile],
  );

  if (listings.length === 0) return null;

  return (
    <div>
      <button className="back" onClick={() => setOpen((v) => !v)}>
        {open ? "지도 접기 ▲" : "지도에서 보기 ▼"}
      </button>
      {open && <MapView markers={markers} height={280} />}
    </div>
  );
}
