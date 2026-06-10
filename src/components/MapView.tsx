import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoPoint } from "../domain/types";

export interface MapMarker {
  location: GeoPoint;
  /** 마커에 항상 보이는 짧은 텍스트 (가격, "내 집" 등) */
  pill: string;
  /** 호버/탭 시 보이는 상세 (매물명 등) */
  detail?: string;
  variant: "listing" | "home" | "work";
}

interface Props {
  markers: MapMarker[];
  height?: number;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * CARTO 라이트 베이스맵 + 알약(pill) 마커.
 * API 키 불필요 (OSM 데이터 기반 무료 타일).
 */
export function MapView({ markers, height = 240 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || markers.length === 0) return;

    const map = L.map(ref.current, { zoomControl: false, attributionControl: true });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    const bounds = L.latLngBounds(markers.map((m) => [m.location.lat, m.location.lng]));
    for (const m of markers) {
      const icon = L.divIcon({
        className: "map-pin",
        html: `<span class="map-pill map-pill-${m.variant}">${escapeHtml(m.pill)}</span>`,
        iconSize: [0, 0],
      });
      const marker = L.marker([m.location.lat, m.location.lng], {
        icon,
        zIndexOffset: m.variant === "listing" ? 0 : 1000,
      }).addTo(map);
      if (m.detail) {
        marker.bindTooltip(escapeHtml(m.detail), {
          direction: "top",
          offset: [0, -18],
          className: "map-tip",
        });
      }
    }
    map.fitBounds(bounds.pad(0.3), { maxZoom: 14 });

    return () => {
      map.remove();
    };
  }, [markers]);

  return <div ref={ref} className="map" style={{ height }} />;
}
