/* ============================================================
   弈 · 名局谱（130 局经典对局 · 打谱研习）
   数据来自 js/kifu-data.js（公有领域档案 + DeepMind 官方发布，
   由 tools/build-kifu.js 生成并经规则引擎逐手校验）
   ============================================================ */
(function (global) {
  'use strict';

  const G = global.GoEngine;
  const B = G.BLACK, W = G.WHITE;
  const DB = global.KIFU;
  const COLS = G.COLS;

  /* ---------- 着法流解码 ---------- */
  function decodeGame(g) {
    const moves = [];      // { i(落点, -1=停一手), color }
    let color = g.hc ? W : B;
    for (let k = 0; k < g.s.length; k += 2) {
      const ch1 = g.s[k], ch2 = g.s[k + 1];
      moves.push(ch1 === 'z' && ch2 === 'z' ? { i: -1, color } : {
        i: (g.s.charCodeAt(k + 1) - 97) * 19 + (g.s.charCodeAt(k) - 97),
        color,
      });
      color = color === B ? W : B;
    }
    const setup = [];
    for (let k = 0; k < (g.ab || '').length; k += 2) {
      setup.push({ x: g.ab.charCodeAt(k) - 97, y: g.ab.charCodeAt(k + 1) - 97 });
    }
    return { moves, setup };
  }

  function coordName(idx) {
    return COLS[idx % 19] + (19 - ((idx / 19) | 0));
  }

  function rankZh(r) {
    if (!r) return '';
    const m = String(r).match(/^(\d+)(d|p|dan)$/i);
    if (m) return m[1] + '段';
    if (/^k$/i.test(String(r))) return '级';
    const km = String(r).match(/^(\d+)k$/i);
    if (km) return km[1] + '级';
    return '';
  }

  /* ---------- 名局控制器 ---------- */

  const KifuCtl = {
    view: null,
    engine: null,
    list: null,
    cur: 0,          // 当前局索引（DB.games）
    pos: 0,          // 当前手数（0 = 空盘/布子）
    dec: null,       // decodeGame 结果
    playing: false,
    speed: 2,        // 0=慢 1=中 2=快
    filterEra: 0,    // 0 = 全部
    query: '',
    _timer: 0,
    SPEEDS: [1500, 800, 380, 160],

    init(view) {
      this.view = view;
      view.onTap = () => this.togglePlay();
      const $ = (s) => document.querySelector(s);

      $('#btn-kf-list').addEventListener('click', () => global.App.show('screen-kifu-list'));
      $('#btn-kf-first').addEventListener('click', () => this.seek(0));
      $('#btn-kf-prev10').addEventListener('click', () => this.seek(this.pos - 10));
      $('#btn-kf-prev').addEventListener('click', () => this.seek(this.pos - 1));
      $('#btn-kf-play').addEventListener('click', () => this.togglePlay());
      $('#btn-kf-next').addEventListener('click', () => this.seek(this.pos + 1));
      $('#btn-kf-next10').addEventListener('click', () => this.seek(this.pos + 10));
      $('#btn-kf-last').addEventListener('click', () => this.seek(this.dec.moves.length));
      $('#kf-slider').addEventListener('input', (e) => this.seek(+e.target.value));
      $('#tg-kf-coords').addEventListener('change', (e) => {
        view.showCoords = e.target.checked; view.requestRender();
      });
      $('#tg-kf-nums').addEventListener('change', (e) => {
        view.showNumbers = e.target.checked; this._syncNumberMap(); view.requestRender();
      });
      document.querySelectorAll('#kf-speed button').forEach((b) => {
        b.addEventListener('click', () => {
          this.speed = +b.dataset.v;
          document.querySelectorAll('#kf-speed button').forEach(x => x.classList.toggle('on', x === b));
        });
      });

      // 目录筛选
      const searchBox = $('#kf-search');
      searchBox.addEventListener('input', () => { this.query = searchBox.value.trim(); this.renderList(); });
      document.querySelectorAll('#kf-era button').forEach((b) => {
        b.addEventListener('click', () => {
          this.filterEra = +b.dataset.v;
          document.querySelectorAll('#kf-era button').forEach(x => x.classList.toggle('on', x === b));
          this.renderList();
        });
      });
      $('#btn-kifu-back').addEventListener('click', () => global.App.show('screen-home'));

      // 键盘
      document.addEventListener('keydown', (e) => {
        if (!document.querySelector('#screen-kifu').classList.contains('active')) return;
        if (e.key === 'ArrowLeft') this.seek(this.pos - 1);
        else if (e.key === 'ArrowRight') this.seek(this.pos + 1);
        else if (e.key === ' ') { e.preventDefault(); this.togglePlay(); }
        else if (e.key === 'Escape') global.App.show('screen-kifu-list');
      });

      this.renderList();
    },

    /* ---------- 目录 ---------- */

    visibleGames() {
      const q = this.query.toLowerCase();
      return DB.games.filter((g) => {
        if (this.filterEra && g.e !== this.filterEra) return false;
        if (q && !(g.b + ' ' + g.w + ' ' + (g.ev || '')).toLowerCase().includes(q)) return false;
        return true;
      });
    },

    renderList() {
      const el = document.querySelector('#kifu-catalog');
      const games = this.visibleGames();
      el.innerHTML = '';
      const frag = document.createDocumentFragment();
      games.forEach((g) => {
        const realIdx = DB.games.indexOf(g);
        const card = document.createElement('button');
        card.className = 'kf-card' + (realIdx === this.cur ? ' on' : '');
        const yr = g.y ? String(g.y) : '年代不详';
        card.innerHTML =
          '<span class="kf-era-tag">' + DB.eras[g.e] + '</span>' +
          '<span class="kf-body">' +
            '<span class="kf-players"><b>' + g.b + '</b><i>对</i><b>' + g.w + '</b></span>' +
            '<span class="kf-meta">' + yr + (g.ev ? ' · ' + g.ev : '') + '</span>' +
          '</span>' +
          '<span class="kf-result">' + (g.re || '') + '</span>';
        card.addEventListener('click', () => this.load(realIdx));
        frag.appendChild(card);
      });
      el.appendChild(frag);
      document.querySelector('#kifu-count').textContent = games.length + ' 局';
    },

    /* ---------- 载入与打谱 ---------- */

    load(idx) {
      this.pause();
      const g = DB.games[idx];
      this.cur = idx;
      this.dec = decodeGame(g);

      this.engine = new G(19);
      for (const s of this.dec.setup) this.engine.board[this.engine.idx(s.x, s.y)] = B;
      this.engine.positionHistory = [this.engine._boardString(this.engine.board)];

      this.pos = 0;
      const v = this.view;
      v.setSize(19);
      v.marks = [];
      v.territory = [];
      v.numberMap = null;
      v.setBoard(this.engine.board);

      // 信息面板
      const $ = (s) => document.querySelector(s);
      $('#kf-black').textContent = g.b;
      $('#kf-white').textContent = g.w;
      $('#kf-black-r').textContent = rankZh(g.bR);
      $('#kf-white-r').textContent = rankZh(g.wR);
      $('#kf-info-ev').textContent = g.ev || '对局详情不详';
      $('#kf-info-dt').textContent = (g.dt || '').replace(/-00.*$/, '');
      $('#kf-info-re').textContent = g.re || '结果不详';
      $('#kf-info-hc').textContent = g.hc ? '让子局 · 白先行' : '分先 · 黑先行';
      $('#kf-slider').max = this.dec.moves.length;

      this.renderList();
      this.sync();
      global.App.show('screen-kifu');
      requestAnimationFrame(() => global.dispatchEvent(new Event('resize')));
    },

    /* 跳转到第 k 手（含负值/越界保护） */
    seek(k) {
      if (!this.dec) return;
      const total = this.dec.moves.length;
      k = Math.max(0, Math.min(total, k | 0));
      if (k === this.pos) return;
      // 快进：从当前局面继续；回退：从布子重放
      if (k < this.pos) this._rebuild();
      const animate = k === this.pos + 1;
      while (this.pos < k) this._step(animate);
      if (this.pos >= total) this.pause();
      this.sync();
    },

    _rebuild() {
      this.engine = new G(19);
      for (const s of this.dec.setup) this.engine.board[this.engine.idx(s.x, s.y)] = B;
      this.engine.positionHistory = [this.engine._boardString(this.engine.board)];
      this.pos = 0;
      const v = this.view;
      v.setBoard(this.engine.board, -1);
    },

    _step(animate) {
      const mv = this.dec.moves[this.pos];
      if (!mv) return;
      if (mv.i === -1) {
        this.engine.pass(mv.color, { force: true });
      } else {
        const [x, y] = this.engine.xy(mv.i);
        const r = this.engine.play(x, y, mv.color, { force: true });
        if (!r.legal) return; // 数据已全量校验，防御性兜底
        if (animate) {
          const v = this.view;
          v.setBoard(this.engine.board, mv.i);
          v.animatePlace(mv.i, mv.color);
          global.Sfx.stone();
          if (r.captured.length) {
            v.animateCapture(r.captured, mv.color === B ? W : B);
            global.Sfx.capture();
          }
        }
      }
      this.pos++;
    },

    sync() {
      const g = DB.games[this.cur];
      const mv = this.dec.moves[this.pos - 1];
      const v = this.view;
      if (mv) {
        v.setBoard(this.engine.board, mv.i === -1 ? -1 : mv.i);
        const capd = this.engine.moves[this.pos - 1] ? this.engine.moves[this.pos - 1].cap : 0;
        const who = mv.color === B ? '黑' : '白';
        document.querySelector('#kf-moveinfo').innerHTML =
          '第 ' + this.pos + ' 手 · ' + who + ' ' +
          (mv.i === -1 ? '停一手' : coordName(mv.i)) +
          (capd ? '<em>（提 ' + capd + ' 子）</em>' : '');
      } else {
        v.setBoard(this.engine.board, -1);
        document.querySelector('#kf-moveinfo').innerHTML =
          this.dec.setup.length ? '让子已布好 · 白先行' : '空盘 · 黑先行（点击棋盘或 ▶ 播放）';
      }
      document.querySelector('#kf-count-now').textContent = this.pos;
      document.querySelector('#kf-count-total').textContent = this.dec.moves.length;
      document.querySelector('#kf-slider').value = this.pos;
      document.querySelector('#btn-kf-play').textContent = this.playing ? '⏸ 暂停' : '▶ 播放';
      document.querySelector('#cap-kf-b').textContent = this.engine.capturesBy[B];
      document.querySelector('#cap-kf-w').textContent = this.engine.capturesBy[W];
      this._syncNumberMap();
      v.requestRender();
    },

    _syncNumberMap() {
      const v = this.view;
      if (!v.showNumbers) return;
      const m = new Map();
      this.engine.moves.forEach((mv, i) => {
        if (!mv.pass) m.set(this.engine.idx(mv.x, mv.y), i + 1);
      });
      v.numberMap = m;
    },

    togglePlay() {
      if (this.playing) { this.pause(); return; }
      if (!this.dec) return;
      if (this.pos >= this.dec.moves.length) this.seek(0);
      this.playing = true;
      document.querySelector('#btn-kf-play').textContent = '⏸ 暂停';
      this._tick();
    },

    _tick() {
      clearTimeout(this._timer);
      if (!this.playing) return;
      if (this.pos >= this.dec.moves.length) {
        const g = DB.games[this.cur];
        this.pause();
        global.App.toast('终局 · ' + (g.re || '结果不详'), 'success');
        return;
      }
      this.seek(this.pos + 1);
      this._timer = setTimeout(() => this._tick(), this.SPEEDS[this.speed]);
    },

    pause() {
      this.playing = false;
      clearTimeout(this._timer);
      const btn = document.querySelector('#btn-kf-play');
      if (btn) btn.textContent = '▶ 播放';
    },
  };

  global.KifuCtl = KifuCtl;
})(typeof window !== 'undefined' ? window : globalThis);
