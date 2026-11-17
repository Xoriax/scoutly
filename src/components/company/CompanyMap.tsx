"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

export interface MapPoint {
  siren: string;
  nom: string;
  latitude: number;
  longitude: number;
  /** Texte secondaire de la bulle (ville…) */
  detail?: string | null;
  /** Lien ouvert depuis la bulle */
  href?: string;
}

interface Props {
  points: MapPoint[];
  /** Hauteur CSS de la carte */
  height?: string;
  /** Zoom utilisé quand il n'y a qu'un point */
  singleZoom?: number;
}

/**
 * Carte OpenStreetMap (Leaflet). Leaflet manipule window dès son import :
 * il est donc chargé dans l'effet, côté navigateur uniquement.
 */
export function CompanyMap({ points, height = "28rem", singleZoom = 15 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || points.length === 0) return;
    let disposed = false;
    let map: import("leaflet").Map | undefined;

    import("leaflet").then((module) => {
      if (disposed) return;
      const L = (module as unknown as { default?: typeof import("leaflet") }).default ?? module;
      map = L.map(container, { scrollWheelZoom: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const bounds: [number, number][] = [];
      for (const point of points) {
        const position: [number, number] = [point.latitude, point.longitude];
        bounds.push(position);
        L.circleMarker(position, {
          radius: 7,
          color: "#ffffff",
          weight: 2,
          fillColor: "#4F46E5",
          fillOpacity: 0.9,
        })
          .bindPopup(popupContent(point))
          .addTo(map);
      }
      if (bounds.length === 1) map.setView(bounds[0], singleZoom);
      else map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
    });

    return () => {
      disposed = true;
      map?.remove();
    };
  }, [points, singleZoom]);

  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-500"
        style={{ height }}
      >
        Aucune position connue à afficher.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="z-0 overflow-hidden rounded-xl border border-slate-200"
      style={{ height }}
      role="region"
      aria-label="Carte des entreprises"
    />
  );
}

/** Contenu de bulle construit en DOM : les noms viennent de l'API, jamais injectés en HTML */
function popupContent(point: MapPoint): HTMLElement {
  const root = document.createElement("div");
  const title = document.createElement(point.href ? "a" : "strong");
  title.textContent = point.nom;
  title.style.fontWeight = "600";
  if (title instanceof HTMLAnchorElement && point.href) title.href = point.href;
  root.appendChild(title);
  if (point.detail) {
    const detail = document.createElement("div");
    detail.textContent = point.detail;
    detail.style.color = "#64748b";
    root.appendChild(detail);
  }
  return root;
}
