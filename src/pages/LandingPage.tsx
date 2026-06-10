import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { useProfile } from "../state/ProfileContext";
import { useCountUp, useReveal } from "../hooks/useReveal";

const FEATURES = [
  {
    icon: "📊",
    title: "내 집 시세 자동 조회",
    desc: "주소만 입력하면 인근 실거래 기반으로 우리 집 시세와 평당가를 추정합니다.",
  },
  {
    icon: "🎯",
    title: "목적 맞춤 추천",
    desc: "출퇴근 단축, 학군, 신혼집, 더 넓은 집 — 이사 목적을 고르면 딱 맞는 집을 점수로 추천합니다.",
  },
  {
    icon: "🏦",
    title: "대출까지 계산된 예산",
    desc: "LTV·DSR·상품 한도를 반영해 진짜 갈 수 있는 집과 월 상환액을 보여줍니다.",
  },
  {
    icon: "🧭",
    title: "가격 × 평수 조합 탐색",
    desc: "비슷한 가격, 조금 낮게, 조금 높게 — 평수 조합 9가지로 선택지를 넓혀보세요.",
  },
  {
    icon: "🗺️",
    title: "3D 지도로 한눈에",
    desc: "매물·내 집·직장 위치를 입체 지도에서 비교하고 통근 시간을 바로 확인합니다.",
  },
  {
    icon: "❤️",
    title: "찜하고 비교",
    desc: "마음에 드는 매물을 찜하면 가격·평수·통근까지 비교 테이블로 정리됩니다.",
  },
];

const STEPS = [
  { n: "1", title: "주소 입력", desc: "내 집과 직장 주소, 자산 정보를 입력하면" },
  { n: "2", title: "시세·예산 확인", desc: "시세를 추정하고 대출 포함 예산을 계산해" },
  { n: "3", title: "다음 집 발견", desc: "목적과 조건에 맞는 이사 갈 집을 찾아드립니다" },
];

const STATS = [
  { value: 400, suffix: "+", label: "탐색 가능한 매물" },
  { value: 7, suffix: "종", label: "은행 대출 상품 비교" },
  { value: 6, suffix: "가지", label: "이사 목적 프리셋" },
  { value: 9, suffix: "조합", label: "가격 × 평수 탐색" },
];

const DISTRICTS = [
  "강남구", "서초구", "송파구", "마포구", "성동구", "영등포구",
  "광진구", "동작구", "강서구", "관악구", "노원구", "은평구",
];

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const { ref, shown } = useReveal();
  return (
    <div
      ref={ref}
      className={`reveal ${shown ? "is-shown" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function Stat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { ref, value: v } = useCountUp(value);
  return (
    <div className="stat">
      <strong>
        <span ref={ref}>{Math.round(v)}</span>
        {suffix}
      </strong>
      <span>{label}</span>
    </div>
  );
}

export function LandingPage() {
  const { profile } = useProfile();
  const startTo = profile ? "/value" : "/setup";

  return (
    <div className="landing">
      <nav className="l-nav">
        <span className="logo">
          <span className="logo-dot" />
          이사갈집
        </span>
        <div className="l-nav-actions">
          <a href="#features" className="l-nav-link">
            기능
          </a>
          <a href="#how" className="l-nav-link">
            이용 방법
          </a>
          <Link to={startTo} className="btn btn-primary btn-sm">
            {profile ? "앱으로 가기" : "무료로 시작"}
          </Link>
        </div>
      </nav>

      <header className="hero">
        <div className="aurora" aria-hidden>
          <span className="blob blob-1" />
          <span className="blob blob-2" />
          <span className="blob blob-3" />
          <span className="grid-overlay" />
        </div>

        <div className="hero-inner">
          <span className="hero-badge">
            <span className="pulse-dot" /> 내 집 시세 기반 이사 플래너
          </span>
          <h1 className="hero-title">
            다음 집, <span className="grad-text">감이 아니라 데이터로</span>
            <br />
            찾으세요
          </h1>
          <p className="hero-sub">
            내 집 시세부터 대출 한도, 통근 시간까지 한 번에 계산해서
            <br />
            지금 진짜 이사 갈 수 있는 집을 보여드립니다.
          </p>
          <div className="cta-row">
            <Link to={startTo} className="btn btn-primary btn-lg shimmer">
              무료로 시작하기 →
            </Link>
            <a href="#features" className="btn btn-ghost btn-lg">
              기능 둘러보기
            </a>
          </div>
          <p className="hero-note">회원가입 없이 · 데모 데이터로 바로 체험</p>

          <div className="hero-card-wrap">
            <div className="hero-card float">
              <div className="hc-head">
                <span className="badge badge-sale">매매</span>
                <span className="badge badge-type">아파트</span>
              </div>
              <p className="hc-price">6억 4,700만</p>
              <p className="hc-meta">노원구 중계동 · 30.6평 · 직장까지 23분</p>
              <div className="hc-bar">
                <span style={{ width: "72%" }} />
              </div>
              <p className="hc-sub">대출 포함 예산 안 · 적합도 92점</p>
            </div>
            <div className="hero-chip chip-a float-slow">🎯 출퇴근 23분</div>
            <div className="hero-chip chip-b float-slow2">🏦 월 상환 191만</div>
            <div className="hero-chip chip-c float-slow">❤️ 찜 3건 비교</div>
          </div>
        </div>

        <div className="marquee" aria-hidden>
          <div className="marquee-track">
            {[...DISTRICTS, ...DISTRICTS].map((d, i) => (
              <span key={i} className="marquee-item">
                📍 {d}
              </span>
            ))}
          </div>
        </div>
      </header>

      <section className="stats-section">
        <div className="stats">
          {STATS.map((s) => (
            <Stat key={s.label} {...s} />
          ))}
        </div>
      </section>

      <section className="l-section" id="features">
        <Reveal>
          <h2 className="l-title">이사 결정에 필요한 모든 것</h2>
          <p className="l-sub">시세 조회부터 대출 시뮬레이션까지, 흩어진 정보를 한 곳에서.</p>
        </Reveal>
        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 70}>
              <article className="feature-card glow">
                <span className="feature-icon">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="l-section" id="how">
        <Reveal>
          <h2 className="l-title">3분이면 충분해요</h2>
        </Reveal>
        <div className="steps">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 110}>
              <div className="step">
                <span className="step-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="cta-band-wrap">
        <Reveal>
          <div className="cta-band">
            <div className="cta-shine" aria-hidden />
            <h2>지금 우리 집, 얼마일까요?</h2>
            <p>주소 입력 한 번으로 시세 확인부터 시작하세요.</p>
            <Link to={startTo} className="btn btn-white btn-lg">
              내 집 시세 확인하기 →
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="l-footer">
        <span className="logo">
          <span className="logo-dot" />
          이사갈집
        </span>
        <p>
          시세·대출 계산은 참고용 추정치입니다. 실제 거래·대출 조건은 기관에
          확인하세요.
        </p>
      </footer>
    </div>
  );
}
