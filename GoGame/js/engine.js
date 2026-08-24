/* ============================================================
   弈 · 围棋规则引擎
   落子 / 提子 / 打劫 / 禁着点 / 悔棋 / 数子法终局
   ============================================================ */
(function (global) {
  'use strict';

  const EMPTY = 0, BLACK = 1, WHITE = 2;
  const opp = c => (c === BLACK ? WHITE : BLACK);

  // 让子点位（按让子数依次取用）
  const HANDICAP = {
    19: [[15, 15], [3, 3], [3, 15], [15, 3], [9, 9], [9, 3], [9, 15], [3, 9], [15, 9]],
    13: [[9, 9], [3, 3], [3, 9], [9, 3], [6, 6]],
    9: [[6, 6], [2, 2], [2, 6], [6, 2], [4, 4]],
  };

  const COLS = 'ABCDEFGHJKLMNOPQRST'; // 依惯例跳过 I

  class GoEngine {
    constructor(size, opts = {}) {
      this.size = size;
      this.handicap = Math.max(0, opts.handicap || 0);
      this.baseKomi = (typeof opts.komi === 'number')
        ? opts.komi
        : (size >= 19 ? 7.5 : size >= 13 ? 6.5 : 5.5);
      this.komi = this.handicap > 0 ? 0.5 : this.baseKomi;
      this._neigh = this._buildNeighbors(size);
      this.reset();
    }

    _buildNeighbors(n) {
      const list = new Array(n * n);
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const a = [];
          if (x > 0) a.push(y * n + x - 1);
          if (x < n - 1) a.push(y * n + x + 1);
          if (y > 0) a.push((y - 1) * n + x);
          if (y < n - 1) a.push((y + 1) * n + x);
          list[y * n + x] = a;
        }
      }
      return list;
    }

    reset() {
      const n = this.size;
      this.board = new Int8Array(n * n);
      this.turn = BLACK;
      this.capturesBy = { 1: 0, 2: 0 }; // 各方提得的子数
      this.moveNumber = 0;
      this.lastMove = null;             // { x, y, color, pass }
      this.consecutivePasses = 0;
      this.over = false;
      this.moves = [];                  // 供棋谱显示
      this.snapshots = [];              // 悔棋快照
      this.koPoint = -1;
      if (this.handicap > 0) {
        const pts = HANDICAP[this.size] || [];
        for (let i = 0; i < Math.min(this.handicap, pts.length); i++) {
          const [x, y] = pts[i];
          this.board[y * n + x] = BLACK;
        }
        this.turn = WHITE; // 让子局白先行
      }
      this.positionHistory = [this._boardString(this.board)];
    }

    /* ---------- 查询 ---------- */

    idx(x, y) { return y * this.size + x; }
    xy(i) { return [i % this.size, (i / this.size) | 0]; }
    at(x, y) { return this.board[this.idx(x, y)]; }
    opponent() { return opp(this.turn); }

    coordName(x, y) {
      return COLS[x] + (this.size - y);
    }

    _boardString(board) { return board.join(','); }

    // 棋块搜索（可在任意棋盘数组上执行）
    groupAt(idx, board) {
      board = board || this.board;
      const color = board[idx];
      const stones = [idx];
      const seen = new Uint8Array(board.length);
      const libs = new Set();
      seen[idx] = 1;
      const stack = [idx];
      while (stack.length) {
        const p = stack.pop();
        for (const nb of this._neigh[p]) {
          const v = board[nb];
          if (v === EMPTY) libs.add(nb);
          else if (v === color && !seen[nb]) { seen[nb] = 1; stones.push(nb); stack.push(nb); }
        }
      }
      return { color, stones, libs };
    }

    /* ---------- 落子 ---------- */

    // 试下一手（不落盘）。返回 { legal, board, captured, pos } 或 { legal:false, reason }
    simulate(x, y, color) {
      const i = this.idx(x, y);
      if (this.board[i] !== EMPTY) return { legal: false, reason: 'occupied' };
      const b = Int8Array.from(this.board);
      b[i] = color;
      const captured = [];
      for (const nb of this._neigh[i]) {
        if (b[nb] !== EMPTY && b[nb] !== color) {
          const g = this.groupAt(nb, b);
          if (g.libs.size === 0) {
            for (const s of g.stones) if (b[s] !== EMPTY) { b[s] = EMPTY; captured.push(s); }
          }
        }
      }
      const own = this.groupAt(i, b);
      if (own.libs.size === 0) return { legal: false, reason: 'suicide' };

      const pos = this._boardString(b);
      const h = this.positionHistory;
      // 简单劫：不得重现上一手之前局面
      if (h.length >= 2 && pos === h[h.length - 2]) return { legal: false, reason: 'ko' };

      return { legal: true, board: b, captured, pos };
    }

    play(x, y, color, opts = {}) {
      if (!opts.force && color !== this.turn) return { legal: false, reason: 'turn' };
      const r = this.simulate(x, y, color);
      if (!r.legal) return r;

      this._pushSnapshot();
      this.board.set(r.board);
      this.capturesBy[color] += r.captured.length;
      this.turn = opp(color);
      this.moveNumber++;
      this.lastMove = { x, y, color, pass: false };
      this.consecutivePasses = 0;

      const g = this.groupAt(this.idx(x, y));
      this.koPoint = (r.captured.length === 1 && g.stones.length === 1 && g.libs.size === 1)
        ? r.captured[0] : -1;

      this.positionHistory.push(r.pos);
      this.moves.push({ x, y, color, pass: false, cap: r.captured.length });
      return { legal: true, captured: r.captured };
    }

    pass(color, opts = {}) {
      if (!opts.force && color !== this.turn) return { legal: false, reason: 'turn' };
      this._pushSnapshot();
      this.turn = opp(color);
      this.moveNumber++;
      this.lastMove = { color, pass: true };
      this.consecutivePasses++;
      this.koPoint = -1;
      this.moves.push({ color, pass: true });
      if (this.consecutivePasses >= 2) this.over = true;
      return { legal: true, over: this.over };
    }

    /* ---------- 悔棋 ---------- */

    canUndo() { return this.snapshots.length > 0; }

    _pushSnapshot() {
      this.snapshots.push({
        board: Int8Array.from(this.board),
        turn: this.turn,
        capB: this.capturesBy[BLACK],
        capW: this.capturesBy[WHITE],
        moveNumber: this.moveNumber,
        lastMove: this.lastMove,
        consecutivePasses: this.consecutivePasses,
        koPoint: this.koPoint,
        histLen: this.positionHistory.length,
        movesLen: this.moves.length,
      });
    }

    undo() {
      const s = this.snapshots.pop();
      if (!s) return false;
      this.board = Int8Array.from(s.board);
      this.turn = s.turn;
      this.capturesBy[BLACK] = s.capB;
      this.capturesBy[WHITE] = s.capW;
      this.moveNumber = s.moveNumber;
      this.lastMove = s.lastMove;
      this.consecutivePasses = s.consecutivePasses;
      this.koPoint = s.koPoint;
      this.positionHistory.length = s.histLen;
      this.moves.length = s.movesLen;
      this.over = false;
      return true;
    }

    /* ---------- 数子（中国规则 · 数子法） ---------- */

    // deadIdx: 被标记为死子的下标数组
    score(deadIdx) {
      const n = this.size;
      const b = Int8Array.from(this.board);
      const dead = new Set(deadIdx || []);
      for (const i of dead) b[i] = EMPTY;

      const terr = { 1: 0, 2: 0 };
      const stones = { 1: 0, 2: 0 };
      const terrMap = new Int8Array(n * n);
      const seen = new Uint8Array(n * n);
      const stack = [];

      for (let i = 0; i < n * n; i++) {
        if (b[i] !== EMPTY) { stones[b[i]]++; continue; }
        if (seen[i]) continue;
        const region = [];
        let touch = 0; // 位标记：1 见黑，2 见白
        stack.push(i); seen[i] = 1;
        while (stack.length) {
          const p = stack.pop();
          region.push(p);
          for (const nb of this._neigh[p]) {
            const v = b[nb];
            if (v === EMPTY) { if (!seen[nb]) { seen[nb] = 1; stack.push(nb); } }
            else touch |= v;
          }
        }
        let owner = 0;
        if (touch === 1) owner = 1; else if (touch === 2) owner = 2;
        if (owner) {
          terr[owner] += region.length;
          for (const p of region) terrMap[p] = owner;
        }
      }

      const black = stones[1] + terr[1];
      const white = stones[2] + terr[2] + this.komi;
      const diff = black - white;
      return {
        black, white, stones, terr, terrMap, deadGiven: dead,
        diff,
        winner: diff > 0 ? BLACK : diff < 0 ? WHITE : 0,
        margin: Math.abs(diff),
      };
    }

    legalMoves(color) {
      const out = [];
      for (let i = 0; i < this.size * this.size; i++) {
        if (this.board[i] !== EMPTY) continue;
        const [x, y] = this.xy(i);
        if (this.simulate(x, y, color).legal) out.push(i);
      }
      return out;
    }

    /* ---------- 教学用：直接布子（不经合法性校验，重置历史） ---------- */

    setStones(list, color) {
      for (const [x, y] of list) this.board[this.idx(x, y)] = color;
      this.positionHistory = [this._boardString(this.board)];
      this.moves = [];
      this.snapshots = [];
      this.koPoint = -1;
      this.over = false;
    }
  }

  GoEngine.EMPTY = EMPTY;
  GoEngine.BLACK = BLACK;
  GoEngine.WHITE = WHITE;
  GoEngine.opp = opp;
  GoEngine.HANDICAP = HANDICAP;
  GoEngine.COLS = COLS;

  global.GoEngine = GoEngine;
})(typeof window !== 'undefined' ? window : globalThis);
