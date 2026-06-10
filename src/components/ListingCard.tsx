import { commuteMinutes } from "../domain/geo";
import { formatArea, formatMoney } from "../domain/format";
import type { GeoPoint, Listing } from "../domain/types";
import { DEAL_TYPE_LABEL, PROPERTY_TYPE_LABEL } from "../domain/types";

interface Props {
  listing: Listing;
  workLocation?: GeoPoint;
  /** 카드 하단에 붙는 부가 정보 (대출 정보, 추천 이유 등) */
  footer?: React.ReactNode;
}

export function ListingCard({ listing: l, workLocation, footer }: Props) {
  const priceLabel =
    l.dealType === "monthly"
      ? `보증금 ${formatMoney(l.price)} / 월 ${l.monthlyRent}만`
      : formatMoney(l.price);

  return (
    <article className="card">
      <div className="card-head">
        <span className={`badge badge-${l.dealType}`}>{DEAL_TYPE_LABEL[l.dealType]}</span>
        <span className="badge badge-type">{PROPERTY_TYPE_LABEL[l.propertyType]}</span>
        <h3>{l.name}</h3>
      </div>
      <p className="price">{priceLabel}</p>
      <p className="meta">
        {l.district} {l.dong} · {formatArea(l.areaM2)} · 방 {l.rooms} · {l.builtYear}년 ·{" "}
        {l.floor}층
        {workLocation && <> · 직장까지 약 {commuteMinutes(l.location, workLocation)}분</>}
      </p>
      {l.tags.length > 0 && (
        <p className="tags">
          {l.tags.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </p>
      )}
      {footer}
    </article>
  );
}
