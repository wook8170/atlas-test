/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 카카오 REST API 키 (주소 검색용) */
  readonly VITE_KAKAO_REST_API_KEY?: string;
  /** 공공데이터포털 국토교통부 실거래가 서비스 키 */
  readonly VITE_MOLIT_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
