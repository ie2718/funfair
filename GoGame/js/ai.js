/* ============================================================
   弈 · AI 对手
   影响力评估 + 战术捕获（提子 / 逃子 / 紧气）启发式
   ============================================================ */
(function (global) {
  'use strict';

  const G = global.GoEngine;
  const BLACK = G.BLACK, WHITE = G.WHITE, EMPTY = G.EMPTY;

  const LEVELS = [
    { label: '入门', rank: '约 25 级', noise: 26,  tactical: 0.35, radius: 2 },
    { label: '初级', rank: '约 15 级', noise: 11,  tactical: 0.75, radius: 3 },
    { label: '中级', rank: '约 5 级',  noise: 4.5, tactical: 1,    radius: 4 },
    { label: '高级', rank: '约 初段',  noise: 1.2, tactical: 1,    radius: 4 },
  ];

  // 开局库：随机取一点
  const OPENING = {
    19: [[3, 3], [15, 15], [3, 15], [15, 3], [9, 9], [2, 4], [15, 14], [3, 14], [15, 4]],
    13: [[3, 3], [9, 9], [3, 9], [9, 3], [6, 6], [2, 4], [10, 8]],
    9:  [[4, 4], [2, 4], [4, 2], [2, 2], [6, 4], [4, 6], [2, 6], [6, 2]],
  };

  // 切比雪夫距离衰减权重（下标即距离）
  const DECAY = [10, 4, 2, 1, 0.5, 0.25];

  function influence(board, n) {
    let total = 0;
    for (let i = 0; i < n * n; i++) {
      const c = board[i];
      if (!c) continue;
      const sx = i % n, sy = (i / n) | 0;
      const sign = c === BLACK ? 1 : -1;
      for (let dy = -5; dy <= 5; dy++) {
        const y = sy + dy;
        if (y < 0 || y >= n) continue;
        for (let dx = -5; dx <= 5; dx++) {
          const x = sx + dx;
          if (x < 0 || x >= n) continue;
          const d = Math.max(Math.abs(dx), Math.abs(dy));
          if (d <= 5) total += sign * DECAY[d];
        }
      }
    }
    return total;
  }

  // 弱棋惩罚（黑方视角）：一口气大罚，两口气小罚
  function safety(engine, board) {
    const n = engine.size;
    const seen = new Uint8Array(n * n);
    let score = 0;
    const stack = [];
    for (let i = 0; i < n * n; i++) {
      if (board[i] === EMPTY || seen[i]) continue;
      const color = board[i];
      const sign = color === BLACK ? 1 : -1;
      const libs = new Set();
      let cnt = 0;
      stack.push(i); seen[i] = 1;
      while (stack.length) {
        const p = stack.pop();
        cnt++;
        for (const nb of engine._neigh[p]) {
          const v = board[nb];
          if (v === EMPTY) libs.add(nb);
          else if (v === color && !seen[nb]) { seen[nb] = 1; stack.push(nb); }
        }
      }
      const L = libs.size;
      let pen = 0;
      if (L === 1) pen = cnt * 14 + 10;
      else if (L === 2) pen = cnt * 3.5;
      else if (L === 3) pen = cnt * 0.8;
      score -= sign * pen;
    }
    return score;
  }

  // 三线四线佳、一线二线差（开局导向）
  function edgePref(board, n) {
    let s = 0;
    for (let i = 0; i < n * n; i++) {
      const c = board[i];
      if (!c) continue;
      const x = i % n, y = (i / n) | 0;
      const m = Math.min(x, y, n - 1 - x, n - 1 - y);
      const w = m === 0 ? -2 : m === 1 ? -0.6 : m === 2 ? 0.9 : m === 3 ? 0.7 : 0;
      s += (c === BLACK ? 1 : -1) * w;
    }
    return s;
  }

  function evaluate(engine, board) {
    const n = engine.size;
    return influence(board, n) + safety(engine, board) + edgePref(board, n);
  }

  // 保守的真眼判定（用于避免填眼）
  function isOwnEye(board, engine, idx, color) {
    const n = engine.size;
    const x = idx % n, y = (idx / n) | 0;
    for (const nb of engine._neigh[idx]) {
      if (board[nb] !== color) return false;
    }
    let oppDiag = 0;
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      if (board[ny * n + nx] === (color === BLACK ? WHITE : BLACK)) oppDiag++;
    }
    return oppDiag === 0;
  }

  function candidatePoints(engine, radius) {
    const n = engine.size;
    const board = engine.board;
    const stones = [];
    for (let i = 0; i < n * n; i++) if (board[i]) stones.push(i);

    if (stones.length === 0) {
      const list = (OPENING[n] || OPENING[9]).map(([x, y]) => y * n + x);
      return list.filter(i => board[i] === EMPTY);
    }

    const set = new Set();
    for (const s of stones) {
      const sx = s % n, sy = (s / n) | 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const y = sy + dy;
        if (y < 0 || y >= n) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const x = sx + dx;
          if (x < 0 || x >= n) continue;
          const i = y * n + x;
          if (board[i] === EMPTY) set.add(i);
        }
      }
    }
    return [...set];
  }

  /**
   * 选择一手。返回 { idx } 或 { pass:true }
   */
  function chooseMove(engine, color, levelIdx) {
    const L = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, levelIdx))];
    const n = engine.size;
    const sign = color === BLACK ? 1 : -1;
    const cands = candidatePoints(engine, L.radius);
    if (!cands.length) return { pass: true };

    const baseEval = evaluate(engine, engine.board);
    const scored = [];
    let bestCapture = null;

    for (const idx of cands) {
      const x = idx % n, y = (idx / n) | 0;
      const sim = engine.simulate(x, y, color);
      if (!sim.legal) continue;

      let s = (evaluate(engine, sim.board) - baseEval) * sign;
      s += sim.captured.length * 13;

      // 送吃惩罚（未提子却自撞一气）
      const own = engine.groupAt(idx, sim.board);
      if (own.libs.size === 1 && sim.captured.length === 0) s -= 22;
      // 填自家真眼近乎永远亏损，直接排除
      if (isOwnEye(engine.board, engine, idx, color) && sim.captured.length === 0) continue;

      s += (Math.random() * 2 - 1) * L.noise;

      if (sim.captured.length > 0 && (!bestCapture || sim.captured.length > bestCapture.cap)) {
        bestCapture = { idx, cap: sim.captured.length };
      }
      scored.push({ idx, s, cap: sim.captured.length });
    }

    if (!scored.length) return { pass: true };
    scored.sort((a, b) => b.s - a.s);
    const best = scored[0];

    // 战术直觉：见提子就提（级别越高越敏锐）
    if (bestCapture && Math.random() < L.tactical) {
      // 高级 AI 不提明显亏的子（提完自陷两口气以下的孤子）
      const capEntry = scored.find(e => e.idx === bestCapture.idx);
      if (!capEntry || capEntry.s > best.s - 14 || Math.random() < L.tactical * 0.6) {
        return { idx: bestCapture.idx };
      }
    }

    // 入门棋手的随性：在尚可的选点里随机
    if (levelIdx === 0 && Math.random() < 0.5) {
      const pool = scored.filter(e => e.s > best.s - 16);
      const pick = pool[(Math.random() * pool.length) | 0];
      if (pick) return { idx: pick.idx };
    }

    // 无利可图时停一手（终局前的收兵）
    if (best.s < 0.8 && engine.moveNumber > n * n * 0.5) return { pass: true };

    return { idx: best.idx };
  }

  global.GoAI = { LEVELS, chooseMove };
})(typeof window !== 'undefined' ? window : globalThis);
