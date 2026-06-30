# Cloud Gardens

A web visualization and editorial site for **Cloud Gardens**, a grassroots
geoengineering proposal for maintaining the land–atmospheric water cycle in the
West Mediterranean basin — a collaboration between the Last Resorts team at
Organismo (TBA21) and the Basque Centre for Climate Change (BC3).

## Overview

- **Hero** — a real-time volumetric cloud scene (`@takram/three-clouds` +
  `@takram/three-atmosphere`) with a ground **ASCII layer** that reflects the
  moving cloud shadows.
- **Animated title** — "Cloud Gardens" is rendered from the *Exposure* variable
  font (custom `EXPO` axis) and built out of individual pixels that assemble on
  hover, with a soft bloom.
- **Editorial essay** — an Are.na-style scrolly article: centered column,
  chapter index, hover-reveal image words, and placeholder figures.

## Run locally

```bash
npm install
npm run dev      # start the Vite dev server
npm run build    # production build to dist/
npm run preview  # preview the production build
```

Open the local URL printed by Vite (e.g. `http://127.0.0.1:5173`).

## Project structure

| Path | Purpose |
| --- | --- |
| `index.html` | Landing page — hero scene + scrolly essay |
| `takram.html` | Standalone cloud / ASCII reference view |
| `src/takram.js` | Three.js scene, clouds, atmosphere, ground ASCII effect |
| `src/title.js` | Pixel-assembled animated title |
| `src/index-list.js` | Essay hover-reveal image previews |
| `src/styles.css` | All styling (hero, title, essay) |
| `public/atmosphere/` | Precomputed atmosphere scattering data |
| `public/fonts/` | Display fonts (Exposure, Lofi Forest) |

## Fonts

The hero title uses the **Exposure** trial font (`EXPO` axis controls the
weight) and the essay can use **Lofi Forest**. These are trial/commercial
typefaces — replace them with licensed copies before any public deployment.

## Credits

Project by Last Resorts, Organismo TBA21, in collaboration with BC3.
