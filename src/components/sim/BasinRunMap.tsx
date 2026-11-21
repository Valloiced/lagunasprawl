"use client";

/**
 * The whole watershed, on the same Leaflet map the interactive map uses, with
 * the CA run painted over it frame by frame.
 *
 * Drawing is split in two so the animation stays cheap: an offscreen canvas at
 * the animation's own 40 m grid holds the accumulated picture and is touched
 * only where pixels convert (a couple of thousand per frame), and the visible
 * canvas just blits that image into whatever the map is currently showing.
 * Panning and zooming therefore cost one drawImage, not a repaint of 4.4 M
 * pixels.
 */
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BASIN_ANIM } from "@/data/generated/basin-anim.generated";
import { BASIN_COLORS, BASIN_STATE, type BasinAnimation } from "@/lib/sim/basin";
import { WATERSHED_CENTER } from "@/data/constants";

interface Props {
  anim: BasinAnimation | null;
  /** -1 before the run starts; otherwise the last frame painted */
  frame: number;
  /** which step the frame belongs to */
  step: 0 | 1 | 2;
  className?: string;
}

function paintBase(img: ImageData, anim: BasinAnimation) {
  const d = img.data;
  for (let i = 0; i < anim.state.length; i++) {
    const s = anim.state[i];
    const c =
      s === BASIN_STATE.built2025
        ? BASIN_COLORS.built2025
        : s === BASIN_STATE.water
          ? BASIN_COLORS.water
          : BASIN_COLORS.outside;
    const p = i * 4;
    d[p] = c[0];
    d[p + 1] = c[1];
    d[p + 2] = c[2];
    d[p + 3] = c[3];
  }
}

function paintBucket(img: ImageData, cells: Int32Array, color: readonly number[]) {
  const d = img.data;
  for (let k = 0; k < cells.length; k++) {
    const p = cells[k] * 4;
    d[p] = color[0];
    d[p + 1] = color[1];
    d[p + 2] = color[2];
    d[p + 3] = color[3];
  }
}

function AnimationLayer({ anim, frame, step }: Props) {
  const map = useMap();
  const visibleRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<ImageData | null>(null);
  const paintedRef = useRef({ step: 0, frame: -1 });

  const bounds = useMemo(
    () => L.latLngBounds(BASIN_ANIM.bounds[0], BASIN_ANIM.bounds[1]),
    []
  );

  // one canvas in the overlay pane, sized to the map and repositioned by
  // Leaflet's own transform hooks
  useEffect(() => {
    // React's development double-mount can tear a map down between the render
    // and this effect, so never assume the pane is still there
    const pane = map.getPanes()?.overlayPane;
    if (!pane) return;
    const canvas = L.DomUtil.create("canvas", "leaflet-zoom-animated") as HTMLCanvasElement;
    canvas.style.pointerEvents = "none";
    pane.appendChild(canvas);
    visibleRef.current = canvas;

    const redraw = () => {
      const off = offscreenRef.current;
      if (!off) return;
      const size = map.getSize();
      if (canvas.width !== size.x || canvas.height !== size.y) {
        canvas.width = size.x;
        canvas.height = size.y;
      }
      const topLeft = map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvas, topLeft);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const nw = map.latLngToContainerPoint(bounds.getNorthWest());
      const se = map.latLngToContainerPoint(bounds.getSouthEast());
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, nw.x, nw.y, se.x - nw.x, se.y - nw.y);
    };

    map.on("move zoom viewreset resize zoomend moveend", redraw);
    redraw();
    return () => {
      map.off("move zoom viewreset resize zoomend moveend", redraw);
      canvas.remove();
      visibleRef.current = null;
      // the accumulated picture belongs to this map instance; a remount starts
      // from the observed 2025 state rather than inheriting a half-run frame
      offscreenRef.current = null;
      imageRef.current = null;
      paintedRef.current = { step: 0, frame: -1 };
    };
  }, [map, bounds]);

  // rebuild the accumulated picture when the animation loads or rewinds
  useEffect(() => {
    if (!anim) return;
    if (!offscreenRef.current) {
      const off = document.createElement("canvas");
      off.width = anim.width;
      off.height = anim.height;
      offscreenRef.current = off;
    }
    const off = offscreenRef.current;
    const ctx = off.getContext("2d");
    if (!ctx) return;

    const rewound =
      step < paintedRef.current.step ||
      (step === paintedRef.current.step && frame < paintedRef.current.frame);

    if (!imageRef.current || rewound) {
      imageRef.current = ctx.createImageData(anim.width, anim.height);
      paintBase(imageRef.current, anim);
      paintedRef.current = { step: 0, frame: -1 };
    }
    const img = imageRef.current;

    // paint only what is newly revealed since the last render
    const from = paintedRef.current;
    if (step >= 1) {
      const start = from.step >= 1 ? from.frame + 1 : 0;
      const end = step === 1 ? frame : anim.frames - 1;
      for (let f = start; f <= end && f < anim.frames; f++) {
        paintBucket(img, anim.buckets1[f], BASIN_COLORS.step1);
      }
    }
    if (step === 2) {
      const start = from.step === 2 ? from.frame + 1 : 0;
      for (let f = start; f <= frame && f < anim.frames; f++) {
        paintBucket(img, anim.buckets2[f], BASIN_COLORS.step2);
      }
    }
    paintedRef.current = { step, frame };

    ctx.putImageData(img, 0, 0);
    map.fire("move");
  }, [anim, frame, step, map]);

  return null;
}

export default function BasinRunMap({ anim, frame, step, className }: Props) {
  return (
    <MapContainer
      center={WATERSHED_CENTER}
      zoom={9}
      minZoom={8}
      maxZoom={14}
      scrollWheelZoom
      className={className}
      style={{ height: "100%", width: "100%", background: "#0b1220" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=cb1_2act_1_d75078d985d33a0726434933"
      />
      <AnimationLayer anim={anim} frame={frame} step={step} />
    </MapContainer>
  );
}
