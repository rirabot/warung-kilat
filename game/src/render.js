// Warung Kilat — all drawing: the kitchen, order board, counter, bins and screens.
// Everything is drawn with canvas shapes and text; no image or font files are loaded.
import { FIELD, FONT, INGREDIENTS, ING_BY_ID, LAYOUT, MAX_MISSES, PALETTE, RECIPE_BY_ID } from './config.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;

/** Bin rects, shared with input hit-testing: 9 bins in one row. */
export function binRect(index) {
  const b = LAYOUT.bins;
  const gap = 8;
  const w = (b.w - gap * (INGREDIENTS.length - 1)) / INGREDIENTS.length;
  return { x: b.x + index * (w + gap), y: b.y, w, h: b.h };
}

export function serveRect() { return LAYOUT.serve; }
export function trashRect() { return LAYOUT.trash; }

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, weight = '700', align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function ingredientChip(ctx, id, x, y, size, highlight) {
  const ing = ING_BY_ID[id];
  ctx.fillStyle = ing.color;
  ctx.strokeStyle = highlight ? PALETTE.gold : ing.accent;
  ctx.lineWidth = highlight ? 4 : 2;
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.font = `${Math.round(size * 0.52)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ing.glyph, x, y + 1);
  ctx.textBaseline = 'alphabetic';
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function draw(state, screen, best, now) {
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    drawKitchen(state, now);
    drawTopBar(state);
    drawOrderBoard(state);
    drawPan(state, now);
    drawButtons(state);
    drawBins(state);
    drawHint(state, screen);
    if (state.flash) drawFlash(state);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) drawOverlay('JEDA', 'Tekan P atau klik untuk lanjut');
    else if (screen === SCREEN_OVER) drawOver(state, best);
  }

  function drawKitchen(state, now) {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.wallStripe;
    for (let x = 0; x < FIELD.width; x += 96) ctx.fillRect(x, 64, 48, 8);
    // Awning stripes above the board.
    for (let i = 0; i < 16; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? '#d64545' : '#fff8ec';
      ctx.fillRect(i * 80, 0, 80, 14);
    }
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(0, 636, FIELD.width, 84);
    // Counter.
    ctx.fillStyle = PALETTE.counter;
    ctx.fillRect(0, 448, FIELD.width, 188);
    ctx.fillStyle = PALETTE.counterTop;
    ctx.fillRect(0, 448, FIELD.width, 22);
    // Hanging lamps.
    for (const x of [220, 640, 1060]) {
      ctx.strokeStyle = '#3a2415';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, 14); ctx.lineTo(x, 46); ctx.stroke();
      ctx.fillStyle = '#f2c94c';
      ctx.beginPath(); ctx.arc(x, 56, 14, 0, Math.PI * 2); ctx.fill();
    }
    void state; void now;
  }

  function drawTopBar(state) {
    const b = LAYOUT.topBar;
    ctx.fillStyle = '#3a2415';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    text(ctx, 'WARUNG KILAT', 20, 42, 30, '#ffd66e', '800');
    text(ctx, `Hari ${state.day}`, 330, 42, 24, '#fff8ec');
    // Day progress bar.
    ctx.fillStyle = '#5a3a22';
    roundRect(ctx, 420, 24, 130, 16, 8); ctx.fill();
    ctx.fillStyle = '#f2c94c';
    const dayFrac = Math.min(1, state.dayElapsed / 45);
    roundRect(ctx, 420, 24, 130 * dayFrac, 16, 8); ctx.fill();
    text(ctx, `🪙 ${state.coins}`, 600, 42, 26, '#f2c94c', '800');
    text(ctx, `Saji: ${state.served}`, 760, 42, 22, '#fff8ec');
    text(ctx, state.combo > 1 ? `🔥 Kombo x${state.combo}` : 'Kombo —', 880, 42, 22, state.combo > 1 ? '#ff9f1c' : '#8a6d4b');
    // Misses: three chillies, lost ones greyed out.
    for (let i = 0; i < MAX_MISSES; i += 1) {
      ctx.globalAlpha = i < state.misses ? 0.25 : 1;
      ctx.font = '26px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('🌶️', 1150 + i * 38, 44);
    }
    ctx.globalAlpha = 1;
  }

  function drawOrderBoard(state) {
    const b = LAYOUT.orderBoard;
    ctx.fillStyle = PALETTE.panel;
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 3;
    roundRect(ctx, b.x, b.y, b.w, b.h, 14); ctx.fill(); ctx.stroke();
    text(ctx, 'PESANAN', 34, b.y + 30, 18, PALETTE.muted, '800');
    if (state.orders.length === 0) {
      text(ctx, 'Menunggu pesanan…', 160, b.y + 78, 24, PALETTE.muted);
      return;
    }
    const w = (b.w - 150) / 3;
    state.orders.forEach((order, i) => {
      const x = 160 + i * w;
      const y = b.y + 10;
      const recipe = RECIPE_BY_ID[order.recipeId];
      const urgent = order.timeLeft < 12;
      ctx.fillStyle = PALETTE.ticket;
      ctx.strokeStyle = urgent ? PALETTE.bad : PALETTE.ticketEdge;
      ctx.lineWidth = urgent ? 3 : 2;
      roundRect(ctx, x, y, w - 14, b.h - 20, 10); ctx.fill(); ctx.stroke();
      text(ctx, order.name, x + 14, y + 30, 21, recipe.color, '800');
      text(ctx, `⏱ ${Math.ceil(order.timeLeft)} dtk`, x + w - 28, y + 30, 18, urgent ? PALETTE.bad : PALETTE.muted, '800', 'right');
      // Required ingredients in order; done ones get a check, next one glows.
      order.needs.forEach((id, j) => {
        const done = j < state.plate.length && state.plate[j] === id;
        const isNext = j === state.plate.length;
        ingredientChip(ctx, id, x + 30 + j * 52, y + 66, 40, isNext && !done);
        if (done) {
          ctx.fillStyle = PALETTE.good;
          ctx.font = '800 18px ' + FONT;
          ctx.textAlign = 'center';
          ctx.fillText('✓', x + 30 + j * 52, y + 44);
        }
      });
      // Timer bar.
      const frac = Math.max(0, order.timeLeft / order.timeMax);
      ctx.fillStyle = '#e8dcc8';
      roundRect(ctx, x + 14, y + 96, w - 42, 10, 5); ctx.fill();
      ctx.fillStyle = urgent ? PALETTE.bad : PALETTE.good;
      roundRect(ctx, x + 14, y + 96, (w - 42) * frac, 10, 5); ctx.fill();
    });
  }

  function drawPan(state, now) {
    const p = LAYOUT.pan;
    text(ctx, 'Wajan & Piring', p.x + 8, p.y + 26, 18, PALETTE.text, '800');
    // Wok.
    ctx.fillStyle = PALETTE.pan;
    ctx.beginPath(); ctx.ellipse(p.x + 250, p.y + 110, 190, 78, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.panInner;
    ctx.beginPath(); ctx.ellipse(p.x + 250, p.y + 104, 168, 62, 0, 0, Math.PI * 2); ctx.fill();
    // Steam when something is cooking.
    if (state.plate.length > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i += 1) {
        const sx = p.x + 190 + i * 60;
        const wob = Math.sin(now / 300 + i * 2) * 8;
        ctx.beginPath();
        ctx.moveTo(sx + wob, p.y + 46);
        ctx.quadraticCurveTo(sx - wob, p.y + 22, sx + wob, p.y + 2);
        ctx.stroke();
      }
    }
    // Plate with the ingredients on it, mid-assembly.
    ctx.fillStyle = PALETTE.plate;
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(p.x + 250, p.y + 116, 120, 44, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (state.plate.length === 0) {
      text(ctx, 'Piring kosong — klik bahan di bawah', p.x + 250, p.y + 122, 16, PALETTE.muted, '600', 'center');
    } else {
      state.plate.forEach((id, i) => {
        const angle = (i / Math.max(1, state.plate.length)) * Math.PI * 2 - Math.PI / 2;
        ingredientChip(ctx, id, p.x + 250 + Math.cos(angle) * 62, p.y + 116 + Math.sin(angle) * 20, 44, false);
      });
      text(ctx, `${state.plate.length} bahan di piring`, p.x + 250, p.y + 206, 16, PALETTE.text, '700', 'center');
    }
  }

  function drawButtons(state) {
    const ready = state.plate.length > 0 && state.orders.some((o) => {
      const needs = RECIPE_BY_ID[o.recipeId].needs;
      return needs.length === state.plate.length && needs.every((id, i) => id === state.plate[i]);
    });
    const s = LAYOUT.serve;
    ctx.fillStyle = ready ? PALETTE.good : '#9aa0a6';
    roundRect(ctx, s.x, s.y, s.w, s.h, 14); ctx.fill();
    text(ctx, ready ? '✅ SAJIKAN!  (Enter)' : 'SAJIKAN  (Enter)', s.x + s.w / 2, s.y + 46, 26, '#ffffff', '800', 'center');
    const t = LAYOUT.trash;
    ctx.fillStyle = '#d64545';
    roundRect(ctx, t.x, t.y, t.w, t.h, 12); ctx.fill();
    text(ctx, '🗑  Buang Piring  (Backspace)', t.x + t.w / 2, t.y + 36, 20, '#ffffff', '700', 'center');
    if (ready) {
      ctx.fillStyle = '#2e9e5b';
      ctx.font = '800 18px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('▲ Piring siap disajikan!', LAYOUT.serve.x + 150, LAYOUT.serve.y - 12);
    }
  }

  function drawBins(state) {
    const b = LAYOUT.bins;
    text(ctx, 'BAHAN — klik atau tekan 1–9', b.x + 4, b.y - 8, 18, '#fff8ec', '800');
    const next = state.plate.length === 0 ? null : null;
    void next;
    INGREDIENTS.forEach((ing, i) => {
      const r = binRect(i);
      const isNext = (() => {
        // Highlight the bin the plate needs next (first matching order).
        for (const order of state.orders) {
          const needs = RECIPE_BY_ID[order.recipeId].needs;
          let ok = true;
          for (let j = 0; j < state.plate.length; j += 1) if (state.plate[j] !== needs[j]) { ok = false; break; }
          if (ok && needs[state.plate.length] === ing.id) return true;
        }
        return false;
      })();
      ctx.fillStyle = '#fff8ec';
      ctx.strokeStyle = isNext ? PALETTE.gold : '#c9a227';
      ctx.lineWidth = isNext ? 5 : 2;
      roundRect(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill(); ctx.stroke();
      ctx.font = '44px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText(ing.glyph, r.x + r.w / 2, r.y + 66);
      text(ctx, ing.name, r.x + r.w / 2, r.y + 104, 19, PALETTE.text, '700', 'center');
      text(ctx, ing.key, r.x + r.w / 2, r.y + 132, 15, PALETTE.muted, '700', 'center');
      if (isNext) text(ctx, '▼', r.x + r.w / 2, r.y - 2, 16, PALETTE.gold, '800', 'center');
    });
  }

  function drawHint(state, screen) {
    const h = LAYOUT.hint;
    ctx.fillStyle = 'rgba(58,36,21,0.85)';
    roundRect(ctx, h.x, h.y, h.w, h.h, 12); ctx.fill();
    const msg = screen === SCREEN_TITLE
      ? 'Klik bahan sesuai urutan di tiket pesanan, lalu SAJIKAN. 3 pesanan hangus = warung tutup!'
      : 'Urutan bahan ada di tiket: bahan berikutnya berbingkai emas. Salah bahan = -5 koin. P = jeda.';
    text(ctx, msg, h.x + 20, h.y + 30, 19, '#fff8ec', '600');
    text(ctx, 'Nasi Goreng: Nasi→Telur→Cabai→Bawang  •  Es Teh: Teh→Gula  •  Sate: Sate→Ayam→Cabai', h.x + 20, h.y + 58, 16, '#ffd66e', '600');
    void state;
  }

  function drawFlash(state) {
    const f = state.flash;
    ctx.globalAlpha = Math.min(1, f.t);
    ctx.fillStyle = f.kind === 'wrong' || f.kind === 'expire' ? PALETTE.bad : PALETTE.good;
    roundRect(ctx, 440, 420, 400, 44, 12); ctx.fill();
    text(ctx, f.text, 640, 450, 22, '#ffffff', '800', 'center');
    ctx.globalAlpha = 1;
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(58,36,21,0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.panel;
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 4;
    roundRect(ctx, 240, 120, 800, 460, 20); ctx.fill(); ctx.stroke();
    text(ctx, 'WARUNG KILAT', 640, 260, 64, '#d64545', '800', 'center');
    text(ctx, 'Masak cepat, sajikan tepat — sebelum pelanggan kabur!', 640, 336, 22, PALETTE.muted, '600', 'center');
    text(ctx, 'Cara main:', 340, 396, 22, PALETTE.text, '800');
    text(ctx, '1. Lihat tiket pesanan di papan atas.', 340, 428, 20, PALETTE.text, '600');
    text(ctx, '2. Klik bahan (atau tekan 1–9) sesuai urutan tiket.', 340, 456, 20, PALETTE.text, '600');
    text(ctx, '3. Kalau piring sudah lengkap, klik SAJIKAN / Enter.', 340, 484, 20, PALETTE.text, '600');
    text(ctx, '4. 3 pesanan hangus = warung tutup. Sajikan cepat = bonus!', 340, 512, 20, PALETTE.text, '600');
    text(ctx, '▶  Klik di mana saja atau tekan Spasi untuk mulai', 640, 556, 24, PALETTE.good, '800', 'center');
    if (best > 0) text(ctx, `Rekor koin: ${best}`, 640, 596, 20, PALETTE.muted, '700', 'center');
    void state;
  }

  function drawOverlay(title, sub) {
    ctx.fillStyle = 'rgba(58,36,21,0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, title, 640, 360, 56, '#fff8ec', '800', 'center');
    text(ctx, sub, 640, 404, 22, '#ffd66e', '600', 'center');
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(58,36,21,0.78)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.panel;
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 4;
    roundRect(ctx, 320, 130, 640, 440, 20); ctx.fill(); ctx.stroke();
    text(ctx, '🏁 WARUNG TUTUP', 640, 210, 48, '#d64545', '800', 'center');
    text(ctx, '3 pesanan hangus — pelanggan pulang semua.', 640, 252, 20, PALETTE.muted, '600', 'center');
    text(ctx, `🪙 Koin: ${state.coins}`, 640, 320, 30, PALETTE.text, '800', 'center');
    text(ctx, `🍽️ Piring disajikan: ${state.served}   •   Hari: ${state.day}   •   Kombo terbaik: x${state.bestCombo}`, 640, 366, 20, PALETTE.text, '600', 'center');
    if (best > 0) text(ctx, `Rekor koin: ${best}`, 640, 404, 20, PALETTE.muted, '700', 'center');
    text(ctx, '▶  Klik atau tekan Spasi untuk main lagi', 640, 470, 24, PALETTE.good, '800', 'center');
    text(ctx, 'Terima kasih sudah mampir ke Warung Kilat!', 640, 520, 18, PALETTE.muted, '600', 'center');
  }

  return { draw };
}
