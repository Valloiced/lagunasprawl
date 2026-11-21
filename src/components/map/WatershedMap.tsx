"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
  ImageOverlay,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Year } from "@/data/types";
import { WATERSHED_CENTER, WATERSHED_ZOOM } from "@/data/constants";
import { municipalities, provinces } from "@/data/areas";
import { GENERATED_MAP_OVERLAYS } from "@/data/generated/map-overlays.generated";
import { SPATIAL_LAYERS } from "@/data/generated/analysis.generated";

// Classified overlays (2015/2020/2025) and CA forecast overlays (2030/2035),
// all emitted by src/s10_web_assets.py.
const MAP_OVERLAYS = GENERATED_MAP_OVERLAYS;

interface WatershedMapProps {
  selectedYear: Year;
  selectedArea: { type: "province" | "city"; slug: string } | null;
  onSelectArea: (type: "province" | "city", slug: string) => void;
  activeLayers?: string[];
  /** overrides the forecast raster, e.g. /prob_2040_protection.png */
  forecastOverlay?: string;
  showLulc?: boolean;
  focus?: { center: [number, number]; zoom: number } | null;
  highlightSlug?: string | null;
}

function MunicipalHighlight({ slug }: { slug: string }) {
  const [feature, setFeature] = useState<any>(null);
  useEffect(() => {
    let live = true;
    fetch("/geojson/municipalities-sim.geojson")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!live || !d) return;
        setFeature(d.features.find((f: any) => f.properties?.slug === slug) ?? null);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [slug]);
  if (!feature) return null;
  return (
    <GeoJSON
      key={slug}
      data={feature}
      style={{
        color: "#4f46e5",
        weight: 3,
        opacity: 1,
        fillColor: "#6366f1",
        fillOpacity: 0.08,
        dashArray: "6 5",
      }}
    />
  );
}

type BoundsMap = Record<string, [[number, number], [number, number]]>;

function SpatialLayers({ active, forecastOverlay }:
                       { active: string[]; forecastOverlay?: string }) {
  const [geo, setGeo] = useState<Record<string, any>>({});
  const [bounds, setBounds] = useState<BoundsMap>({});
  const layers = SPATIAL_LAYERS.filter((l) => active.includes(l.id));

  useEffect(() => {
    fetch("/overlay-bounds.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setBounds(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    layers
      .filter((l) => l.kind !== "raster")
      .forEach((l) => {
        if (geo[l.id]) return;
        fetch(l.source)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => d && setGeo((g) => ({ ...g, [l.id]: d })))
          .catch(() => {});
      });
  }, [active.join(",")]);

  return (
    <>
      {layers.map((l) => {
        if (l.kind === "raster") {
          // a horizon/scenario overlay overrides the default forecast raster;
          // every overlay's bounds are keyed by its filename in
          // overlay-bounds.json, so derive the key rather than hardcoding it
          const url =
            l.id === "forecast" && forecastOverlay ? forecastOverlay : l.source;
          const key =
            l.id === "tp" ? "tp_2020" : url.replace(/^\//, "").replace(/\.png$/, "");
          const b = bounds[key] ?? bounds[l.id === "forecast" ? "prob_2035" : "constraint"];
          if (!b) return null;
          return (
            <ImageOverlay
              key={url}
              url={url}
              bounds={b}
              opacity={l.id === "constraint" ? 0.55 : 0.7}
            />
          );
        }
        const data = geo[l.id];
        if (!data) return null;
        if (l.kind === "polygons") {
          return (
            <GeoJSON
              key={l.id}
              data={data}
              style={{ color: l.color, weight: 1.5, fillColor: l.color, fillOpacity: 0.28 }}
              onEachFeature={(f: any, layer: any) => {
                const p = f.properties || {};
                layer.bindTooltip(p.name || p.NAME || "Protected area", { sticky: true });
              }}
            />
          );
        }
        if (l.kind === "lines") {
          return (
            <GeoJSON key={l.id} data={data} style={{ color: l.color, weight: 3 }} />
          );
        }
        // points
        return (
          <GeoJSON
            key={l.id}
            data={data}
            pointToLayer={(_f: any, latlng: any) =>
              L.circleMarker(latlng, {
                radius: l.id === "dpwh" ? 4 : 6,
                color: "#fff",
                weight: 1,
                fillColor: l.color,
                fillOpacity: 0.95,
              })
            }
            onEachFeature={(f: any, layer: any) => {
              const p = f.properties || {};
              const title = p.name || p.descriptio || p.description || "Project";
              const extra = p.budget
                ? `<br/><span style="opacity:.7">₱${(p.budget / 1e6).toFixed(0)}M · ${p.status ?? ""}</span>`
                : p.municipality
                  ? `<br/><span style="opacity:.7">${p.municipality}</span>`
                  : "";
              layer.bindTooltip(`<b>${title}</b>${extra}`, { sticky: true });
            }}
          />
        );
      })}
    </>
  );
}

// Custom map logic component
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [map, center, zoom]);
  return null;
}

export default function WatershedMap({
  selectedYear,
  selectedArea,
  onSelectArea: _onSelectArea,
  activeLayers = [],
  forecastOverlay,
  showLulc = true,
  focus = null,
  highlightSlug = null,
}: WatershedMapProps) {
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [muniData, setMuniData] = useState<any>(null);
  const [selectionFeature, setSelectionFeature] = useState<any>(null);

  useEffect(() => {
    // Load Watershed Basin
    fetch("/geojson/watershed-boundary.geojson")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setGeoJsonData(data))
      .catch(() => {});

    // Load Municipalities/Provinces for zooming/filtering
    fetch("/geojson/municipalities.geojson")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setMuniData(data))
      .catch(() => {});
  }, []);

  // Handle zooming to selected area
  const [mapInstance, setMapInstance] = useState<any>(null);

  useEffect(() => {
    if (!muniData || !selectedArea || !mapInstance) {
      // Don't stomp an external focus target (per-municipality simulate view)
      if (!selectedArea && mapInstance && !focus) {
        // Reset view to watershed
        mapInstance.setView(WATERSHED_CENTER, WATERSHED_ZOOM, { animate: true });
        setSelectionFeature(null);
      }
      return;
    }

    const feature = muniData.features.find((f: any) => 
      f.properties.slug === selectedArea.slug && 
      f.properties.type === selectedArea.type
    );

    if (feature) {
      // Small delay to ensure state transitions smoothly
      setSelectionFeature(null);
      const timer = setTimeout(() => {
        setSelectionFeature(feature);
        const layer = L.geoJSON(feature);
        const bounds = layer.getBounds();
        mapInstance.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
      }, 50);
      return () => clearTimeout(timer);
    }

    const fallbackArea =
      selectedArea.type === "city"
        ? municipalities.find((municipality) => municipality.slug === selectedArea.slug)
        : provinces.find((province) => province.slug === selectedArea.slug);

    if (fallbackArea) {
      setSelectionFeature(null);
      mapInstance.flyTo(fallbackArea.center, selectedArea.type === "province" ? 10 : 11, {
        duration: 1.5,
      });
    }
  }, [selectedArea?.slug, selectedArea?.type, muniData, mapInstance, focus]);

  const getStyle = (_feature: any) => {
    // In a real app we'd get the slug from feature.properties.ID or something
    // Render vector lines but no fill because the custom raster provides the LULC pixel data
    return {
      fillColor: "transparent",
      weight: 2.5,
      opacity: 0.95,
      color: "#1f2937",
      fillOpacity: 0,
    };
  };

  // Overlay URL and bounds are emitted by the pipeline
  // (scripts/python/10_generate_web_assets.py) per year.
  const overlay = MAP_OVERLAYS[selectedYear];

  const initialCenter = focus ? focus.center : WATERSHED_CENTER;
  const initialZoom = focus ? focus.zoom : WATERSHED_ZOOM;
  // Remount the map when the focus target changes so it initializes already
  // centered (post-mount setView proved unreliable inside grid cells).
  const mapKey = focus ? `${focus.center[0]},${focus.center[1]},${focus.zoom}` : "watershed";

  return (
    <MapContainer
      key={mapKey}
      center={initialCenter}
      zoom={initialZoom}
      scrollWheelZoom={true}
      className="w-full h-full z-0"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=cb1_2act_1_d75078d985d33a0726434933"
      />

      <div ref={(ref) => {
        // This is a hack because MapContainer doesn't give direct access easily in this version
        // In a real project we'd use useMap() or a ref on MapContainer
      }} />
      
      {/* Hook to capture map instance */}
      <MapCapture onMap={setMapInstance} />
      <FocusController focus={focus} />

      {showLulc && overlay && (
        <ImageOverlay
          key={selectedYear}
          url={overlay.url}
          bounds={overlay.bounds}
          opacity={0.58}
          className="lulc-map-overlay"
        />
      )}

      <SpatialLayers active={activeLayers} forecastOverlay={forecastOverlay} />

      {highlightSlug && <MunicipalHighlight slug={highlightSlug} />}

      {geoJsonData && (
        <GeoJSON
          data={geoJsonData}
          style={getStyle}
        />
      )}

      {selectionFeature && selectedArea && (
        <GeoJSON
          key={`highlight-${selectedArea.type}-${selectedArea.slug}`}
          data={selectionFeature}
          style={{
            fillColor: "transparent",
            weight: 3.5,
            color: "#111827",
            opacity: 1,
            fillOpacity: 0,
            dashArray: "10 8",
            lineCap: "butt",
          }}
        />
      )}
    </MapContainer>
  );
}

// Utility component to get map instance
function MapCapture({ onMap }: { onMap: (map: any) => void }) {
  const map = useMap();
  useEffect(() => {
    onMap(map);
    if (typeof window !== "undefined") (window as any).__leafletMap = map;
    // Leaflet often mounts before its flex/grid cell has its final size, so it
    // measures 0 and loads too few tiles. Re-measure once layout settles.
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 600);
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      ro.disconnect();
    };
  }, [map, onMap]);
  return null;
}

// Fly to an external focus target (used by the per-municipality simulate page)
function FocusController({
  focus,
}: {
  focus: { center: [number, number]; zoom: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    // Map mounts already centered on the focus target (via MapContainer key),
    // so we only need to make sure it re-measures its container for tiles.
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map, focus?.center[0], focus?.center[1], focus?.zoom]);
  return null;
}
