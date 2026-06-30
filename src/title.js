// Pixel-by-pixel animated title.
// The Exposure variable font has a custom "EXPO" axis (-100..+100) that canvas
// text can't set, so we render the word through an SVG (with the font embedded
// + font-variation-settings) and sample THAT into the animated pixels.

const TEXT = 'Cloud Gardens';

// ---- tweakables -----------------------------------------------------------
const EXPO = -100;        // fatness: the font's EXPO axis (-100 = fattest .. +100 = thin)
const SIZE_FACTOR = 0.08; // title size relative to viewport width
const SIZE_MAX = 150;     // hard cap in CSS px
const LETTER_SPACING = -0.03; // in em
const TITLE_CENTER_Y = 0.4; // vertical center of the title, as a fraction of the hero
const COLOR = '#f9f9f4';
// ---------------------------------------------------------------------------

const FONT_URL = `${import.meta.env.BASE_URL}fonts/ExposureTrialVAR.ttf`;
const FONT_FAMILY = 'ExposureEmbedded';

const app = document.querySelector('#app');
const canvas = document.querySelector('#title');

if (app && canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let particles = [];
  let hovering = false;
  let time = 0;
  let fontDataUrl = null;

  async function loadFontDataUrl() {
    if (fontDataUrl) return fontDataUrl;
    const res = await fetch(FONT_URL);
    const bytes = new Uint8Array(await res.arrayBuffer());
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    fontDataUrl = `data:font/ttf;base64,${btoa(binary)}`;
    return fontDataUrl;
  }

  function renderTextImage(w, h, fontSize) {
    const ls = (LETTER_SPACING * fontSize).toFixed(2);
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<style>` +
      `@font-face{font-family:'${FONT_FAMILY}';src:url('${fontDataUrl}') format('truetype');}` +
      `text{font-family:'${FONT_FAMILY}';font-size:${fontSize}px;` +
      `font-variation-settings:'EXPO' ${EXPO};letter-spacing:${ls}px;fill:#ffffff;}` +
      `</style>` +
      `<text x="${w / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="central">${TEXT}</text>` +
      `</svg>`;
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  async function buildParticles() {
    const cssW = app.clientWidth;
    const cssH = app.clientHeight;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const fontSize = Math.min(cssW * SIZE_FACTOR, SIZE_MAX) * dpr;

    let img;
    try {
      await loadFontDataUrl();
      img = await renderTextImage(canvas.width, canvas.height, fontSize);
    } catch (e) {
      return; // font couldn't load; leave the title empty rather than wrong
    }

    const off = document.createElement('canvas');
    off.width = canvas.width;
    off.height = canvas.height;
    const octx = off.getContext('2d', { willReadFrequently: true });
    octx.drawImage(img, 0, 0);
    const data = octx.getImageData(0, 0, off.width, off.height).data;

    // Fine grid so the letterforms keep their shape; each lit cell -> one dot.
    const cell = Math.max(2, Math.round(fontSize / 110));

    // First gather the lit cells and their bounding box, so we can recenter the
    // word precisely (SVG baseline placement is unreliable across browsers).
    const raw = [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let y = 0; y < off.height; y += cell) {
      for (let x = 0; x < off.width; x += cell) {
        if (data[(y * off.width + x) * 4 + 3] > 80) {
          raw.push(x, y);
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const dx = canvas.width / 2 - (minX + maxX) / 2;
    const dy = canvas.height * TITLE_CENTER_Y - (minY + maxY) / 2;

    particles = [];
    for (let i = 0; i < raw.length; i += 2) {
      const tx = raw[i] + dx + (Math.random() - 0.5) * cell * 0.5;
      const ty = raw[i + 1] + dy + (Math.random() - 0.5) * cell * 0.5;
      particles.push({
        tx,
        ty,
        sx: tx + (Math.random() - 0.5) * canvas.width * 0.5,
        sy: ty + (Math.random() - 0.5) * canvas.height * 0.5,
        x: tx + (Math.random() - 0.5) * canvas.width * 0.5,
        y: ty + (Math.random() - 0.5) * canvas.height * 0.5,
        o: 0,
        size: cell,
        seed: Math.random() * Math.PI * 2
      });
    }
  }

  function frame() {
    time += 0.016;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = COLOR;

    for (const p of particles) {
      const destX = hovering ? p.tx : p.sx;
      const destY = hovering ? p.ty : p.sy;
      const destO = hovering ? 1 : 0;

      p.x += (destX - p.x) * 0.045;
      p.y += (destY - p.y) * 0.045;
      p.o += (destO - p.o) * 0.06;

      if (p.o < 0.01) continue;

      const settle = Math.max(0, 1 - (Math.abs(destX - p.x) + Math.abs(destY - p.y)) * 0.02);
      const jx = hovering ? Math.sin(time * 2.4 + p.seed) * 0.6 * settle : 0;
      const jy = hovering ? Math.cos(time * 2.0 + p.seed) * 0.6 * settle : 0;
      const s = Math.max(1, p.size * 0.95);

      ctx.globalAlpha = p.o;
      ctx.fillRect(p.x + jx, p.y + jy, s, s);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  app.addEventListener('pointerenter', () => (hovering = true));
  app.addEventListener('pointerleave', () => (hovering = false));

  let resizeId;
  window.addEventListener('resize', () => {
    clearTimeout(resizeId);
    resizeId = setTimeout(buildParticles, 150);
  });

  async function init() {
    try {
      await document.fonts.ready;
    } catch (e) {
      /* ignore */
    }
    await buildParticles();
    frame();
  }

  init();
}
