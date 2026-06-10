# 이사갈집 (movehome)

내 집 시세를 기준으로 다음 집을 찾아주는 부동산 웹앱.

## 기능

1. **내 정보 입력** — 내 집 주소·직장 주소·주택 유형·평수·연소득·현금·기존 대출 입력
2. **내 집 시세 조회** — 인근 동일 유형 매물 평당가 기반 추정 + 비슷한 가격대 매물 추천
3. **목적 기반 추천** — 출퇴근 단축 / 학군 / 신혼집 / 더 넓은 집 / 조용한 환경 / 투자 가치
4. **대출·예산 계산** — 은행 대출 상품(LTV·DSR·상품한도) 반영, 이사 갈 수 있는 집과 월 상환액 표시
5. **가격 × 평수 조합 탐색** — 비슷한/조금 낮은/조금 높은 가격 × 작은/비슷한/넓은 평수 9가지 조합
6. **매물 상세 + 지도** — Leaflet/OpenStreetMap 지도에 매물·내 집·직장 표시, 대출 상품별 이사 시뮬레이션
7. **찜·비교** — ♡로 찜한 매물을 지도와 비교 테이블로 한눈에 비교
8. **반응형** — 모바일(하단 탭) / 데스크톱(상단 탭 + 카드 그리드) 레이아웃
9. **랜딩 페이지** — `/` 에 SaaS 스타일 소개 페이지 (히어로/기능/이용 방법/CTA)

매매 · 전세 · 월세, 아파트 · 오피스텔 · 빌라/다세대 · 단독주택 지원.

## 기술 스택

- Vite + React 18 + TypeScript
- React Router (해시 라우팅, 하단 5탭)
- Vitest (도메인 로직 + 목데이터 테스트)
- 모바일 우선 UI

## 실행

```bash
npm install
npm run dev      # 개발 서버
npm test         # 테스트
npm run build    # 프로덕션 빌드
```

## 구조

```
src/
├── domain/        # 순수 로직 (대출 계산, 목적 매칭, 가격대 탐색, 지오 유틸)
├── data/
│   ├── providers.ts   # 데이터 어댑터 인터페이스
│   └── mock/          # 목 구현 (서울 12개 구 매물 ~400건 결정적 생성)
├── pages/         # 5개 화면 (Setup / Value / Purpose / Budget / Explore)
├── components/    # ListingCard 등 공용 UI
└── state/         # 사용자 프로필 (localStorage 영속)
```

## 실제 API로 전환하기

실제 API 어댑터가 이미 구현되어 있다. `.env.example`을 `.env.local`로 복사해
키를 채우면 자동으로 전환된다 (키가 없으면 목데이터로 동작):

```bash
cp .env.example .env.local
# VITE_KAKAO_REST_API_KEY=...   카카오 개발자 콘솔 REST API 키
# VITE_MOLIT_API_KEY=...        공공데이터포털 국토부 실거래가 서비스 키
```

| 어댑터 | 목 구현 | 실제 구현 |
|---|---|---|
| `GeocodeProvider` | 동 이름 매칭 | `KakaoGeocodeProvider` (카카오 주소 검색) |
| `ListingProvider` | 결정적 생성 매물 | `MolitListingProvider` (국토부 아파트 실거래가, 매매+전월세) |
| `PriceProvider` | — | `ListingBasedPriceProvider` (매물 소스 공용) |
| `LoanProvider` | 대표 상품 7종 | 미구현 (금융감독원 금융상품 비교공시 API 후보) |

국토부 어댑터는 현재 아파트만 지원하며, 오피스텔·연립다세대 API도 같은
패턴(`src/data/real/molitListings.ts`)으로 확장하면 된다.

대출 계산은 DSR 40%, LTV(상품별), 전세대출 80% 규칙을 단순화해 반영한 참고용 추정치다.
