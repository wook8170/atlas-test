import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { providers } from "../data";
import { toM2 } from "../domain/geo";
import type { PropertyType } from "../domain/types";
import { PROPERTY_TYPE_LABEL } from "../domain/types";
import { useProfile } from "../state/ProfileContext";

export function SetupPage() {
  const { profile, saveProfile } = useProfile();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const [homeAddress, setHomeAddress] = useState(profile?.homeAddress ?? "");
  const [workAddress, setWorkAddress] = useState(profile?.workAddress ?? "");
  const [propertyType, setPropertyType] = useState<PropertyType>(
    profile?.propertyType ?? "apartment",
  );
  const [pyeong, setPyeong] = useState(
    profile ? (profile.areaM2 / 3.3058).toFixed(0) : "25",
  );
  const [annualIncome, setAnnualIncome] = useState(String(profile?.annualIncome ?? 6000));
  const [cash, setCash] = useState(String(profile?.cash ?? 5000));
  const [existingLoan, setExistingLoan] = useState(String(profile?.existingLoan ?? 0));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!homeAddress.trim() || !workAddress.trim()) return;
    setBusy(true);
    try {
      const [home, work] = await Promise.all([
        providers.geocode.geocode(homeAddress.trim()),
        providers.geocode.geocode(workAddress.trim()),
      ]);
      const areaM2 = toM2(Number(pyeong) || 25);
      const estimate = await providers.price.estimate(home.location, propertyType, areaM2);
      saveProfile({
        homeAddress: homeAddress.trim(),
        homeLocation: home.location,
        workAddress: workAddress.trim(),
        workLocation: work.location,
        propertyType,
        areaM2,
        annualIncome: Number(annualIncome) || 0,
        cash: Number(cash) || 0,
        existingLoan: Number(existingLoan) || 0,
        estimatedPrice: estimate.price,
      });
      navigate("/value");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2>내 정보 입력</h2>
      <p className="hint">
        내 집과 직장 주소를 입력하면 시세를 조회하고, 이사 갈 수 있는 집을 찾아드립니다.
      </p>
      <form onSubmit={onSubmit} className="form">
        <label>
          내 집 주소
          <input
            value={homeAddress}
            onChange={(e) => setHomeAddress(e.target.value)}
            placeholder="예: 서울 노원구 중계동"
            required
          />
        </label>
        <label>
          직장 주소
          <input
            value={workAddress}
            onChange={(e) => setWorkAddress(e.target.value)}
            placeholder="예: 서울 강남구 역삼동"
            required
          />
        </label>
        <div className="form-row">
          <label>
            주택 유형
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value as PropertyType)}
            >
              {Object.entries(PROPERTY_TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            전용면적 (평)
            <input
              type="number"
              min="5"
              max="100"
              value={pyeong}
              onChange={(e) => setPyeong(e.target.value)}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            연소득 (만원)
            <input
              type="number"
              min="0"
              value={annualIncome}
              onChange={(e) => setAnnualIncome(e.target.value)}
            />
          </label>
          <label>
            보유 현금 (만원)
            <input type="number" min="0" value={cash} onChange={(e) => setCash(e.target.value)} />
          </label>
          <label>
            기존 대출 잔액 (만원)
            <input
              type="number"
              min="0"
              value={existingLoan}
              onChange={(e) => setExistingLoan(e.target.value)}
            />
          </label>
        </div>
        <button type="submit" className="primary" disabled={busy}>
          {busy ? "시세 조회 중…" : "시세 조회하고 시작하기"}
        </button>
      </form>
    </section>
  );
}
