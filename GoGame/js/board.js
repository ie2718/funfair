/* ============================================================
   弈 · 棋盘渲染（Canvas：木纹 / 云子 / 落子动画 / 标记）
   ============================================================ */
(function (global) {
  'use strict';

  const BLACK = 1, WHITE = 2;
  const COLS = 'ABCDEFGHJKLMNOPQRST';
  const HOSHI = {
    19: [[3, 3], [9, 3], [15, 3], [3, 9], [9, 9], [15, 9], [3, 15], [9, 15], [15, 15]],
    13: [[3, 3], [9, 3], [3, 9], [9, 9], [6, 6]],
    9: [[2, 2], [6, 2], [2, 6], [6, 6], [4, 4]],
  };

  // 可复现的伪随机（保证木纹稳定）
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class BoardView {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.size = 9;
      this.stones = new Int8Array(0);
      this.marks = [];          // { x, y, type, color?, text? }
      this.territory = [];      // { x, y, color }
      this.deadMarks = new Set();
      this.numberMap = null;    // Map(idx → 手数)
      this.lastMoveIdx = -1;
      this.ghostIdx = -1;
      this.ghostColor = 0;
      this.ghostProvider = null; // () => color | 0
      this.scoringMode = false;
      this.showCoords = true;
      this.showNumbers = false;
      this.onTap = null;
      this.anims = [];
      this._raf = 0;
      this._wood = null;
      this._woodKey = '';

      this._hoverable = matchMedia && matchMedia('(hover: hover)').matches;

      canvas.addEventListener('click', (e) => {
        const i = this._hit(e);
        if (i >= 0 && this.onTap) this.onTap(i, e);
      });
      canvas.addEventListener('pointermove', (e) => {
        if (!this._hoverable || !this.ghostProvider) return;
        const i = this._hit(e);
        const color = i >= 0 ? (this.ghostProvider() || 0) : 0;
        if (i !== this.ghostIdx || color !== this.ghostColor) {
          this.ghostIdx = color && i >= 0 && this.stones[i] === 0 ? i : -1;
          this.ghostColor = color;
          this.requestRender();
        }
      });
      canvas.addEventListener('pointerleave', () => {
        if (this.ghostIdx >= 0) { this.ghostIdx = -1; this.requestRender(); }
      });
    }

    /* ---------- 尺寸与布局 ---------- */

    resize(cssSize) {
      const dpr = Math.min(2.5, (global.devicePixelRatio || 1) * 1);
      this.cssSize = cssSize;
      this.dpr = dpr;
      this.canvas.width = Math.round(cssSize * dpr);
      this.canvas.height = Math.round(cssSize * dpr);
      this.canvas.style.width = cssSize + 'px';
      this.canvas.style.height = cssSize + 'px';
      this._metrics();
      this.requestRender();
    }

    setSize(n) {
      this.size = n;
      this.stones = new Int8Array(n * n);
      this.deadMarks.clear();
      this.numberMap = null;
      this.lastMoveIdx = -1;
      this.ghostIdx = -1;
      this.anims = [];
      this._metrics();
      this.requestRender();
    }

    setBoard(board, lastMoveIdx = -1) {
      this.stones = Int8Array.from(board);
      this.lastMoveIdx = lastMoveIdx;
      this.deadMarks.clear();
      this.requestRender();
    }

    _metrics() {
      const n = this.size;
      const s = this.cssSize || 600;
      this.margin = s * (n >= 19 ? 0.055 : n >= 13 ? 0.065 : 0.075);
      this.cell = (s - this.margin * 2) / (n - 1);
      this.origin = this.margin;
    }

    px(idx) {
      const x = idx % this.size, y = (idx / this.size) | 0;
      return [this.origin + x * this.cell, this.origin + y * this.cell];
    }

    _hit(e) {
      const rect = this.canvas.getBoundingClientRect();
      const sx = this.cssSize / rect.width;
      const px = (e.clientX - rect.left) * sx;
      const py = (e.clientY - rect.top) * sx;
      const gx = Math.round((px - this.origin) / this.cell);
      const gy = Math.round((py - this.origin) / this.cell);
      if (gx < 0 || gy < 0 || gx >= this.size || gy >= this.size) return -1;
      const cx = this.origin + gx * this.cell, cy = this.origin + gy * this.cell;
      if (Math.hypot(px - cx, py - cy) > this.cell * 0.48) return -1;
      return gy * this.size + gx;
    }

    /* ---------- 动画 ---------- */

    animatePlace(idx, color) {
      this.anims.push({ type: 'place', idx, color, t0: performance.now(), dur: 190 });
      this._loop();
    }

    animateCapture(idxs, color) {
      for (const idx of idxs) {
        this.anims.push({ type: 'capture', idx, color, t0: performance.now(), dur: 260 });
      }
      this._loop();
    }

    _loop() {
      if (this._raf) return;
      const tick = () => {
        const now = performance.now();
        this.anims = this.anims.filter(a => now - a.t0 < a.dur);
        this.render();
        if (this.anims.length) this._raf = requestAnimationFrame(tick);
        else this._raf = 0;
      };
      this._raf = requestAnimationFrame(tick);
    }

    requestRender() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => { this._raf = 0; this.render(); });
    }

    /* ---------- 木纹底板 ---------- */

    _buildWood() {
      const key = this.size + '|' + this.canvas.width;
      if (this._woodKey === key && this._wood) return;
      const w = this.canvas.width;
      const c = document.createElement('canvas');
      c.width = w; c.height = w;
      const x = c.getContext('2d');
      const rnd = mulberry32(20240909);

      const g = x.createLinearGradient(0, 0, w * 0.2, w);
      g.addColorStop(0, '#e2b96f');
      g.addColorStop(0.45, '#d8ad5e');
      g.addColorStop(0.75, '#cfa153');
      g.addColorStop(1, '#c3964a');
      x.fillStyle = g;
      x.fillRect(0, 0, w, w);

      // 顶部受光
      const hl = x.createRadialGradient(w * 0.3, w * 0.1, 0, w * 0.3, w * 0.1, w * 0.9);
      hl.addColorStop(0, 'rgba(255,238,190,0.22)');
      hl.addColorStop(1, 'rgba(255,238,190,0)');
      x.fillStyle = hl;
      x.fillRect(0, 0, w, w);

      // 纵向木纹
      const strands = Math.round(w / 9);
      for (let i = 0; i < strands; i++) {
        const x0 = rnd() * w;
        const amp = 2 + rnd() * 9;
        const wl = 70 + rnd() * 190;
        const phase = rnd() * Math.PI * 2;
        const alpha = 0.028 + rnd() * 0.075;
        const dark = rnd() > 0.25;
        x.strokeStyle = dark ? `rgba(112,72,26,${alpha})` : `rgba(246,220,160,${alpha * 0.9})`;
        x.lineWidth = 0.6 + rnd() * 1.6;
        x.beginPath();
        for (let y = 0; y <= w; y += 10) {
          const xx = x0 + Math.sin(y / wl * Math.PI * 2 + phase) * amp;
          y === 0 ? x.moveTo(xx, y) : x.lineTo(xx, y);
        }
        x.stroke();
      }
      // 几道宽带
      for (let i = 0; i < 7; i++) {
        const x0 = rnd() * w;
        const wd = 8 + rnd() * 26;
        const gg = x.createLinearGradient(x0, 0, x0 + wd, 0);
        gg.addColorStop(0, 'rgba(120,78,28,0)');
        gg.addColorStop(0.5, `rgba(120,78,28,${0.03 + rnd() * 0.05})`);
        gg.addColorStop(1, 'rgba(120,78,28,0)');
        x.fillStyle = gg;
        x.fillRect(x0, 0, wd, w);
      }

      // 四周渐暗
      const vg = x.createRadialGradient(w / 2, w / 2, w * 0.32, w / 2, w / 2, w * 0.78);
      vg.addColorStop(0, 'rgba(70,40,10,0)');
      vg.addColorStop(1, 'rgba(70,40,10,0.34)');
      x.fillStyle = vg;
      x.fillRect(0, 0, w, w);

      this._wood = c;
      this._woodKey = key;
    }

    /* ---------- 绘制 ---------- */

    render() {
      const ctx = this.ctx;
      const s = this.cssSize, n = this.size, cell = this.cell;
      if (!s) return;
      this._buildWood();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, s, s);
      ctx.drawImage(this._wood, 0, 0, s, s);

      // 教学高亮底色
      for (const m of this.marks) {
        if (m.type !== 'cell') continue;
        const [cx, cy] = this.px(m.y * n + m.x);
        ctx.fillStyle = m.color || 'rgba(200,65,47,0.18)';
        this._roundRect(cx - cell * 0.5, cy - cell * 0.5, cell, cell, cell * 0.18);
        ctx.fill();
      }

      // 网格
      ctx.strokeStyle = 'rgba(56,34,12,0.82)';
      ctx.lineWidth = Math.max(1, s * 0.0016);
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const p = this.origin + i * cell;
        ctx.moveTo(this.origin, p); ctx.lineTo(this.origin + (n - 1) * cell, p);
        ctx.moveTo(p, this.origin); ctx.lineTo(p, this.origin + (n - 1) * cell);
      }
      ctx.stroke();
      // 外框略重
      ctx.lineWidth = Math.max(1.4, s * 0.0024);
      ctx.strokeRect(this.origin, this.origin, (n - 1) * cell, (n - 1) * cell);

      // 星位
      ctx.fillStyle = 'rgba(48,30,10,0.9)';
      for (const [hx, hy] of (HOSHI[n] || [])) {
        const [cx, cy] = this.px(hy * n + hx);
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(2.2, cell * 0.11), 0, Math.PI * 2);
        ctx.fill();
      }

      // 坐标
      if (this.showCoords) {
        ctx.fillStyle = 'rgba(62,40,16,0.62)';
        ctx.font = `600 ${Math.max(9, this.margin * 0.42)}px 'Cormorant Garamond', Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const off = this.margin * 0.52;
        for (let i = 0; i < n; i++) {
          const p = this.origin + i * cell;
          const ch = COLS[i];
          ctx.fillText(ch, p, this.origin - off);
          ctx.fillText(ch, p, this.origin + (n - 1) * cell + off);
          const num = String(n - i);
          ctx.fillText(num, this.origin - off, p);
          ctx.fillText(num, this.origin + (n - 1) * cell + off, p);
        }
      }

      // 地域标记（数子）
      const ts = cell * 0.24;
      for (const t of this.territory) {
        const [cx, cy] = this.px(t.y * n + t.x);
        if (t.color === BLACK) {
          ctx.fillStyle = 'rgba(22,18,14,0.92)';
          ctx.fillRect(cx - ts / 2, cy - ts / 2, ts, ts);
        } else {
          ctx.fillStyle = 'rgba(248,242,226,0.95)';
          ctx.fillRect(cx - ts / 2, cy - ts / 2, ts, ts);
          ctx.strokeStyle = 'rgba(90,70,40,0.6)';
          ctx.lineWidth = 1;
          ctx.strokeRect(cx - ts / 2, cy - ts / 2, ts, ts);
        }
      }

      // 棋子
      const animMap = new Map();
      const now = performance.now();
      for (const a of this.anims) {
        const p = Math.min(1, (now - a.t0) / a.dur);
        if (a.type === 'place') animMap.set(a.idx, { scale: 1 + 0.24 * (1 - this._easeOut(p)), alpha: 0.55 + 0.45 * this._easeOut(p) });
        else animMap.set('c' + a.idx, { scale: 1 - 0.4 * p, alpha: 1 - p, color: a.color });
      }
      for (let i = 0; i < n * n; i++) {
        const c = this.stones[i];
        if (!c) continue;
        const an = animMap.get(i);
        const [cx, cy] = this.px(i);
        const dead = this.deadMarks.has(i);
        this._drawStone(cx, cy, cell * 0.47, c,
          an ? an.scale : 1,
          dead ? 0.32 : (an ? an.alpha : 1));
        if (dead) this._drawDeadX(cx, cy, cell);
      }
      // 提子残影
      for (const a of this.anims) {
        if (a.type !== 'capture') continue;
        const st = animMap.get('c' + a.idx);
        if (!st) continue;
        const [cx, cy] = this.px(a.idx);
        this._drawStone(cx, cy, cell * 0.47 * st.scale, a.color, st.scale, st.alpha * 0.9);
      }

      // 最后一手标记
      if (this.lastMoveIdx >= 0 && this.stones[this.lastMoveIdx]) {
        const [cx, cy] = this.px(this.lastMoveIdx);
        const c = this.stones[this.lastMoveIdx];
        ctx.strokeStyle = c === BLACK ? 'rgba(236,226,200,0.95)' : 'rgba(193,58,40,0.95)';
        ctx.lineWidth = Math.max(1.4, cell * 0.055);
        ctx.beginPath();
        ctx.arc(cx, cy, cell * 0.47 * 0.48, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 手数
      if (this.showNumbers && this.numberMap) {
        ctx.font = `600 ${Math.max(8, cell * 0.34)}px 'Cormorant Garamond', Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const [idx, num] of this.numberMap) {
          if (!this.stones[idx]) continue;
          const [cx, cy] = this.px(idx);
          ctx.fillStyle = this.stones[idx] === BLACK ? 'rgba(233,224,200,0.92)' : 'rgba(40,30,20,0.85)';
          ctx.fillText(String(num), cx, cy + cell * 0.02);
        }
      }

      // 标记（圈 / 三角 / 叉 / 点 / 字）
      for (const m of this.marks) {
        if (m.type === 'cell') continue;
        const idx = m.y * n + m.x;
        const [cx, cy] = this.px(idx);
        const onStone = this.stones[idx] !== 0;
        const color = m.color || (onStone
          ? (this.stones[idx] === BLACK ? '#ecdfc4' : '#c33a28')
          : '#c33a28');
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = Math.max(1.6, cell * 0.07);
        if (m.type === 'circle') {
          ctx.beginPath();
          ctx.arc(cx, cy, cell * 0.34, 0, Math.PI * 2);
          ctx.stroke();
        } else if (m.type === 'dot') {
          ctx.beginPath();
          ctx.arc(cx, cy, cell * 0.14, 0, Math.PI * 2);
          ctx.stroke();
        } else if (m.type === 'cross') {
          const l = cell * 0.22;
          ctx.beginPath();
          ctx.moveTo(cx - l, cy - l); ctx.lineTo(cx + l, cy + l);
          ctx.moveTo(cx + l, cy - l); ctx.lineTo(cx - l, cy + l);
          ctx.stroke();
        } else if (m.type === 'triangle') {
          const r = cell * 0.3;
          ctx.beginPath();
          ctx.moveTo(cx, cy - r);
          ctx.lineTo(cx + r * 0.88, cy + r * 0.62);
          ctx.lineTo(cx - r * 0.88, cy + r * 0.62);
          ctx.closePath();
          ctx.stroke();
        } else if (m.type === 'square') {
          const l = cell * 0.28;
          ctx.strokeRect(cx - l, cy - l, l * 2, l * 2);
        } else if (m.type === 'letter') {
          ctx.font = `700 ${Math.max(11, cell * 0.52)}px 'Noto Serif SC', serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(m.text || '', cx, cy + cell * 0.03);
        }
      }

      // 悬停虚子
      if (this.ghostIdx >= 0 && this.ghostColor) {
        const [cx, cy] = this.px(this.ghostIdx);
        this._drawStone(cx, cy, cell * 0.47, this.ghostColor, 1, 0.45, true);
      }
    }

    _drawStone(cx, cy, r, color, scale = 1, alpha = 1, ghost = false) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = alpha;
      const rr = r * scale;
      if (!ghost) {
        ctx.shadowColor = 'rgba(30,16,4,0.42)';
        ctx.shadowBlur = r * 0.24;
        ctx.shadowOffsetY = r * 0.16;
      }
      let g;
      if (color === BLACK) {
        g = ctx.createRadialGradient(cx - rr * 0.34, cy - rr * 0.38, rr * 0.1, cx, cy, rr * 1.08);
        g.addColorStop(0, '#71767f');
        g.addColorStop(0.32, '#30333a');
        g.addColorStop(1, '#0a0b0e');
      } else {
        g = ctx.createRadialGradient(cx - rr * 0.3, cy - rr * 0.34, rr * 0.12, cx, cy, rr * 1.04);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.55, '#f2ecdc');
        g.addColorStop(1, '#bfb7a0');
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      // 高光
      if (!ghost) {
        const hg = ctx.createRadialGradient(cx - rr * 0.36, cy - rr * 0.4, 0, cx - rr * 0.36, cy - rr * 0.4, rr * 0.5);
        hg.addColorStop(0, color === BLACK ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.85)');
        hg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    _drawDeadX(cx, cy, cell) {
      const ctx = this.ctx;
      ctx.strokeStyle = 'rgba(195,58,40,0.95)';
      ctx.lineWidth = Math.max(1.6, cell * 0.06);
      const l = cell * 0.3;
      ctx.beginPath();
      ctx.moveTo(cx - l, cy - l); ctx.lineTo(cx + l, cy + l);
      ctx.moveTo(cx + l, cy - l); ctx.lineTo(cx - l, cy + l);
      ctx.stroke();
    }

    _roundRect(x, y, w, h, r) {
      const ctx = this.ctx;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    _easeOut(p) { return 1 - Math.pow(1 - p, 3); }
  }

  global.BoardView = BoardView;
})(typeof window !== 'undefined' ? window : globalThis);
