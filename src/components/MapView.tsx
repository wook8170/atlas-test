import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoPoint } from "../domain/types";

export interface MapMarker {
  location: GeoPoint;
  label: string;
  color: string;
}

interface Props {
  markers: MapMarker[];
  height?: number;
}

/** OpenStreetMap 타일 기반 지도. API 키 불필요. */
export function MapView({ markers, height = 240 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!ref.current || markers.length === 0) return;

    const map = L.map(ref.current, { zoomControl: false, attributionControl: true });
    mapRef.current = map;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    const bounds = L.latLngBounds(markers.map((m) => [m.location.lat, m.location.lng]));
    for (const m of markers) {
      L.circleMarker([m.location.lat, m.location.lng], {
        radius: 9,
        color: "#fff",
        weight: 2,
        fillColor: m.color,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip(m.label, { permanent: true, direction: "top", offset: [0, -10] });
    }
    map.fitBounds(bounds.pad(0.3), { maxZoom: 14 });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [markers]);

  return <div ref={ref} className="map" style={{ height }} />;
}
