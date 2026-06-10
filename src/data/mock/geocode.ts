import type { GeocodeProvider, GeocodeResult } from "../providers";
import { DISTRICTS } from "./districts";
import { hashString, mulberry32 } from "./seed";

/**
 * 주소 문자열에서 동/구 이름을 찾아 좌표를 돌려주는 목 지오코더.
 * 알 수 없는 주소는 서울 시내 임의 좌표로 결정적 매핑한다.
 */
export class MockGeocodeProvider implements GeocodeProvider {
  async geocode(address: string): Promise<GeocodeResult> {
    const normalized = address.replace(/\s+/g, "");
    for (const d of DISTRICTS) {
      for (const dong of d.dongs) {
        if (normalized.includes(dong.dong) || normalized.includes(dong.dong.replace(/동$/, ""))) {
          return {
            address,
            district: d.district,
            location: { lat: dong.lat, lng: dong.lng },
          };
        }
      }
      if (normalized.includes(d.district) || normalized.includes(d.district.replace(/구$/, ""))) {
        const first = d.dongs[0];
        return { address, district: d.district, location: { lat: first.lat, lng: first.lng } };
      }
    }
    // 알 수 없는 주소 → 서울 중심부 근처에 결정적으로 배치
    const rng = mulberry32(hashString(normalized));
    return {
      address,
      district: "서울",
      location: { lat: 37.49 + rng() * 0.15, lng: 126.85 + rng() * 0.27 },
    };
  }
}
