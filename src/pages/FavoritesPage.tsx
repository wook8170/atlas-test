import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ListingCard } from "../components/ListingCard";
import { ResultsMap } from "../components/ResultsMap";
import { formatMoney } from "../domain/format";
import { commuteMinutes, toPyeong } from "../domain/geo";
import { providers } from "../data";
import type { Listing } from "../domain/types";
import { DEAL_TYPE_LABEL, PROPERTY_TYPE_LABEL } from "../domain/types";
import { useFavorites } from "../state/FavoritesContext";
import { useProfile } from "../state/ProfileContext";

export function FavoritesPage() {
  const { profile } = useProfile();
  const { ids } = useFavorites();
  const [all, setAll] = useState<Listing[]>([]);

  useEffect(() => {
    let cancelled = false;
    providers.listings.search().then((r) => {
      if (!cancelled) setAll(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const favorites = useMemo(
    () => ids.map((id) => all.find((l) => l.id === id)).filter((l): l is Listing => !!l),
    [ids, all],
  );

  if (!profile) return null;

  if (favorites.length === 0) {
    return (
      <section>
        <h2>찜한 매물</h2>
        <p className="hint">
          아직 찜한 매물이 없습니다. 매물 카드의 ♡ 버튼을 눌러 찜하면 여기서 한눈에
          비교할 수 있습니다. <Link to="/value">시세 화면에서 매물 보기 →</Link>
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2>찜한 매물 ({favorites.length}건)</h2>
      <ResultsMap listings={favorites} profile={profile} />

      {favorites.length >= 2 && (
        <>
          <h2>한눈에 비교</h2>
          <div className="table-wrap">
            <table className="compare">
              <thead>
                <tr>
                  <th>항목</th>
                  {favorites.map((l) => (
                    <th key={l.id}>
                      <Link to={`/listing/${l.id}`} className="card-link">
                        {l.name}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>거래/유형</th>
                  {favorites.map((l) => (
                    <td key={l.id}>
                      {DEAL_TYPE_LABEL[l.dealType]} · {PROPERTY_TYPE_LABEL[l.propertyType]}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th>가격</th>
                  {favorites.map((l) => (
                    <td key={l.id}>
                      <strong>{formatMoney(l.price)}</strong>
                      {l.dealType === "monthly" && <> / 월 {l.monthlyRent}만</>}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th>면적</th>
                  {favorites.map((l) => (
                    <td key={l.id}>{toPyeong(l.areaM2).toFixed(1)}평</td>
                  ))}
                </tr>
                <tr>
                  <th>방</th>
                  {favorites.map((l) => (
                    <td key={l.id}>{l.rooms}개</td>
                  ))}
                </tr>
                <tr>
                  <th>준공</th>
                  {favorites.map((l) => (
                    <td key={l.id}>{l.builtYear}년</td>
                  ))}
                </tr>
                <tr>
                  <th>층</th>
                  {favorites.map((l) => (
                    <td key={l.id}>{l.floor}층</td>
                  ))}
                </tr>
                <tr>
                  <th>직장까지</th>
                  {favorites.map((l) => (
                    <td key={l.id}>약 {commuteMinutes(l.location, profile.workLocation)}분</td>
                  ))}
                </tr>
                <tr>
                  <th>위치</th>
                  {favorites.map((l) => (
                    <td key={l.id}>
                      {l.district} {l.dong}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th>특징</th>
                  {favorites.map((l) => (
                    <td key={l.id}>{l.tags.join(", ") || "—"}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2>목록</h2>
      <div className="list">
        {favorites.map((l) => (
          <ListingCard key={l.id} listing={l} workLocation={profile.workLocation} />
        ))}
      </div>
    </section>
  );
}
