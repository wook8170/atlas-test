import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoPoint } from "../domain/types";

export interface MapMarker {
  location: GeoPoint;
  /** 마커에 항상 보이는 짧은 텍스트 (가격, "내 집" 등) */
  pill: string;
  /** 호버 시 보이는 상세 (매물명 등) */
  detail?: string;
  variant: "listing" | "home" | "work";
}

interface Props {
  markers: MapMarker[];
  height?: number;
}

const PITCH_3D = 55;
const BEARING_3D = -15;

/**
 * MapLibre GL 3D 지도. API 키 불필요.
 * - 베이스: CARTO 라이트 래스터 타일
 * - 3D 건물: OpenFreeMap 벡터 타일의 building 레이어를 돌출(extrusion)
 */
function buildStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      carto: {
        type: "raster",
        tiles: ["a", "b", "c", "d"].map(
          (s) => `https://${s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png`,
        ),
        tileSize: 256,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/attributions">CARTO</a> © <a href="https://openfreemap.org">OpenFreeMap</a>',
      },
      openmaptiles: {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
      },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": "#edeff5" } },
      { id: "carto", type: "raster", source: "carto" },
      {
        id: "3d-buildings",
        type: "fill-extrusion",
        source: "openmaptiles",
        "source-layer": "building",
        minzoom: 13,
        paint: {
          "fill-extrusion-color": [
            "interpolate",
            ["linear"],
            ["coalesce", ["get", "render_height"], 10],
            0,
            "#e4e8f4",
            60,
            "#c9cff2",
            160,
            "#a9b4ec",
          ],
          "fill-extrusion-height": ["coalesce", ["get", "render_height"], 10],
          "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
          "fill-extrusion-opacity": 0.85,
        },
      },
    ],
  } as StyleSpecification;
}

export function MapView({ markers, height = 260 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [is3d, setIs3d] = useState(true);

  useEffect(() => {
    if (!ref.current || markers.length === 0) return;

    const map = new maplibregl.Map({
      container: ref.current,
      style: buildStyle(),
      center: [markers[0].location.lng, markers[0].location.lat],
      zoom: 12,
      pitch: PITCH_3D,
      bearing: BEARING_3D,
      canvasContextAttributes: { antialias: true },
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    // 타일 서버 접근 불가 등 네트워크 오류는 치명적이지 않으므로 무시
    map.on("error", () => {});
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    const bounds = new maplibregl.LngLatBounds();
    for (const m of markers) bounds.extend([m.location.lng, m.location.lat]);
    map.fitBounds(bounds, {
      padding: 70,
      maxZoom: 14.5,
      pitch: PITCH_3D,
      bearing: BEARING_3D,
      duration: 0,
    });

    for (const m of markers) {
      const el = document.createElement("div");
      el.style.zIndex = m.variant === "listing" ? "1" : "2";
      const pill = document.createElement("span");
      pill.className = `map-pill map-pill-${m.variant}`;
      pill.textContent = m.pill;
      el.appendChild(pill);

      new maplibregl.Marker({ element: el, anchor: "bottom", offset: [0, -3] })
        .setLngLat([m.location.lng, m.location.lat])
        .addTo(map);

      if (m.detail) {
        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 26,
          className: "map-tip-popup",
        }).setText(m.detail);
        el.addEventListener("mouseenter", () =>
          popup.setLngLat([m.location.lng, m.location.lat]).addTo(map),
        );
        el.addEventListener("mouseleave", () => popup.remove());
      }
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [markers]);

  function toggle3d() {
    const map = mapRef.current;
    if (!map) return;
    const to3d = map.getPitch() < 10;
    map.easeTo({
      pitch: to3d ? PITCH_3D : 0,
      bearing: to3d ? BEARING_3D : 0,
      duration: 650,
    });
    setIs3d(to3d);
  }

  return (
    <div className="map-wrap">
      <div ref={ref} className="map" style={{ height }} />
      <button className="map-3d-btn" onClick={toggle3d} title="2D/3D 전환">
        {is3d ? "2D" : "3D"}
      </button>
    </div>
  );
}
