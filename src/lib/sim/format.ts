/**
 * Readers for the binaries written by src/s17_sim_tile.py.
 *
 * Both files are gzipped and byte-shuffled; nothing here is lossy, so the
 * Float32Array a tile yields holds the same bits the pipeline read out of the
 * GeoTIFF. Keep this file in step with pack_tile() / pack_model() in stage 17.
 */

const MAGIC_TILE = 0x4c54534c; // "LSTL" little-endian
const MAGIC_MODEL = 0x4758534c; // "LSXG" little-endian

export const BAND_F32 = 0;
export const BAND_U8 = 1;

export interface TileBands {
  [name: string]: Float32Array | Uint8Array;
}

export interface Tile {
  version: number;
  width: number;
  height: number;
  core: number;
  pad: number;
  originRow: number;
  originCol: number;
  bands: TileBands;
}

export interface PackedForest {
  nTrees: number;
  nFeatures: number;
  nNodes: number;
  intercept: number;
  /** node-index range of tree t is [offset[t], offset[t + 1]) */
  offset: Uint32Array;
  left: Uint32Array;
  right: Uint32Array;
  /** split threshold on an internal node, leaf weight on a leaf */
  value: Float32Array;
  /** split feature, or 255 to mark a leaf */
  feature: Uint8Array;
  defaultLeft: Uint8Array;
}

/** Fetch a .gz and inflate it. Streams, so the whole file is never held twice. */
export async function fetchBinary(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status} ${res.statusText}`);
  if (!url.endsWith(".gz")) return res.arrayBuffer();
  if (typeof DecompressionStream === "undefined") {
    throw new Error(
      "This browser cannot inflate the simulation data (DecompressionStream missing)."
    );
  }
  const stream = res.body!.pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
}

/** Undo the byte-plane shuffle stage 17 applies to float bands. */
function unshuffle(src: Uint8Array, n: number): Float32Array {
  const out = new Uint8Array(n * 4);
  for (let plane = 0; plane < 4; plane++) {
    const base = plane * n;
    for (let i = 0; i < n; i++) out[i * 4 + plane] = src[base + i];
  }
  return new Float32Array(out.buffer);
}

export function parseTile(buf: ArrayBuffer): Tile {
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== MAGIC_TILE) throw new Error("not a tile file");
  const version = dv.getUint32(4, true);
  const width = dv.getUint32(8, true);
  const height = dv.getUint32(12, true);
  const core = dv.getUint32(16, true);
  const pad = dv.getUint32(20, true);
  const nBands = dv.getUint32(24, true);
  const originRow = dv.getInt32(28, true);
  const originCol = dv.getInt32(32, true);

  const descs: { name: string; dtype: number; shuffled: number }[] = [];
  let off = 36;
  const dec = new TextDecoder();
  for (let i = 0; i < nBands; i++) {
    const raw = new Uint8Array(buf, off, 32);
    let end = raw.indexOf(0);
    if (end < 0) end = 32;
    descs.push({
      name: dec.decode(raw.subarray(0, end)),
      dtype: dv.getUint8(off + 32),
      shuffled: dv.getUint8(off + 33),
    });
    off += 36;
  }

  const n = width * height;
  const bands: TileBands = {};
  for (const d of descs) {
    if (d.dtype === BAND_F32) {
      const src = new Uint8Array(buf, off, n * 4);
      bands[d.name] = d.shuffled
        ? unshuffle(src, n)
        : new Float32Array(src.slice().buffer);
      off += n * 4;
    } else {
      bands[d.name] = new Uint8Array(buf, off, n);
      off += n;
    }
  }
  if (off !== buf.byteLength) {
    throw new Error(`tile payload length mismatch: ${off} != ${buf.byteLength}`);
  }
  return { version, width, height, core, pad, originRow, originCol, bands };
}

export function parseModel(buf: ArrayBuffer): PackedForest {
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== MAGIC_MODEL) throw new Error("not a model file");
  const nTrees = dv.getUint32(8, true);
  const nFeatures = dv.getUint32(12, true);
  const nNodes = dv.getUint32(16, true);
  const intercept = dv.getFloat32(20, true);

  let off = 28;
  const offset = new Uint32Array(buf.slice(off, off + (nTrees + 1) * 4));
  off += (nTrees + 1) * 4;
  const left = new Uint32Array(buf.slice(off, off + nNodes * 4));
  off += nNodes * 4;
  const right = new Uint32Array(buf.slice(off, off + nNodes * 4));
  off += nNodes * 4;
  const value = new Float32Array(buf.slice(off, off + nNodes * 4));
  off += nNodes * 4;
  const feature = new Uint8Array(buf, off, nNodes);
  off += nNodes;
  const defaultLeft = new Uint8Array(buf, off, nNodes);

  return { nTrees, nFeatures, nNodes, intercept, offset, left, right, value, feature, defaultLeft };
}
