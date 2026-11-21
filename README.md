# LagunaSprawl

**Forecasting urban sprawl in the Laguna de Bay watershed with a hybrid cellular automata and machine learning model.**

LagunaSprawl turns Sentinel-2 satellite imagery into land-cover maps for 2015, 2020 and 2025, learns where built-up land has been spreading, and forecasts where it is likely to spread next, out to 2040. This repository is the web viewer: planners and the public can explore the maps, compare scenarios and watch the model work step by step.

🌐 **Live site:** _link added after the first deployment_

---

## What you can do in the app

| Page | What it shows |
|---|---|
| **Dashboard** | Current built-up share (21.1% in 2025), change since 2015, and the land-cover mix |
| **Interactive map** | Land-cover maps for 2015 to 2040 on a time slider, plus urbanization probability, development constraints, economic zones, road projects and protected areas |
| **2035 forecast** | Built-up growth under three scenarios: business as usual, environmental protection and infrastructure-led |
| **Municipality sim** | How growth is distributed across the 63 cities and municipalities |
| **Spatial patterns** | Landscape-expansion types (infill, edge expansion, outlying growth) |
| **Areas** | Per-province and per-city pages with metrics, validation and suggested actions |
| **Algorithm simulation** | A guided, zoomable walkthrough of the model, from the whole watershed down to single 10 m cells, running the CA engine live in a Web Worker |

## How the model works

1. **Land-cover classification.** Sentinel-2 composites from Google Earth Engine are classified into built-up, agriculture and open land, forest and vegetation, and water at 10 m resolution. The 2025 map reaches **82.4% overall accuracy (κ 0.72)** against 395 hand-labelled validation points.
2. **Transition model.** A Random Forest learns how likely each non-built cell is to become built-up from nine spatial drivers, such as distance to roads, slope and nearby built-up density. SHAP values explain which drivers matter most.
3. **Cellular automata.** Each simulation step allocates a Markov-chain demand for new built-up land to the most suitable cells, weighting each by its neighbourhood and blocking protected or unbuildable land.
4. **Monte Carlo ensemble.** Many stochastic runs are combined into probability-of-urbanization maps for 2030, 2035 and 2040.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Leaflet / React-Leaflet · Recharts · Turf.js · Web Workers

The modelling pipeline (Python, scikit-learn, Google Earth Engine, rasterio) runs separately. It exports the maps, statistics and simulation tiles in `public/` and `src/data/generated/`, so the site needs no backend.

## Running locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Team

Undergraduate thesis, Software Engineering, 2026.

| Member | Role |
|---|---|
| William Jefferson J. Demillo | Lead researcher and project manager: validation, statistics, LGU coordination |
| John Bernard L. Velasco | Data acquisition and preprocessing: Earth Engine exports, master grid, driver stack |
| **Vince Harold C. Sualog** | **Modelling engineer: Random Forest transition model, CA engine, forecast runs** |
| Mark Genessy I. Mamore | Web system developer: this viewer and the web asset generation |
