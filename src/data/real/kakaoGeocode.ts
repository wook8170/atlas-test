import type { GeocodeProvider, GeocodeResult } from "../providers";

/**
 * 카카오 로컬 API 주소 검색.
 * https://developers.kakao.com/docs/latest/ko/local/dev-guide#address-coord
 * REST API 키 필요 (VITE_KAKAO_REST_API_KEY).
 */
export class KakaoGeocodeProvider implements GeocodeProvider {
  constructor(private readonly apiKey: string) {}

  async geocode(address: string): Promise<GeocodeResult> {
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${this.apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`카카오 주소 검색 실패: HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      documents: Array<{
        address_name: string;
        x: string;
        y: string;
        address?: { region_2depth_name?: string };
        road_address?: { region_2depth_name?: string };
      }>;
    };
    const doc = data.documents[0];
    if (!doc) {
      throw new Error(`주소를 찾을 수 없습니다: ${address}`);
    }
    return {
      address: doc.address_name,
      district:
        doc.address?.region_2depth_name ?? doc.road_address?.region_2depth_name ?? "",
      location: { lat: Number(doc.y), lng: Number(doc.x) },
    };
  }
}
