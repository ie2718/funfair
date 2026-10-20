/* 引擎与 AI 自测：node tools/selftest.js */
'use strict';
require('../js/engine.js');
require('../js/ai.js');
require('../js/kifu-data.js');

const { GoEngine, GoAI, KIFU } = globalThis;
const B = GoEngine.BLACK, W = GoEngine.WHITE;
let failed = 0;

function ok(cond, msg) {
  if (cond) console.log('  ✓ ' + msg);
  else { failed++; console.error('  ✗ ' + msg); }
}

console.log('— 规则引擎 —');

{ // 基础提子：中间一子被四面包围
  const e = new GoEngine(9);
  e.setStones([[4, 4]], B);
  e.setStones([[3, 4], [5, 4], [4, 3]], W);
  const r = e.play(4, 5, W, { force: true });
  ok(r.legal && r.captured.length === 1, '提掉中央黑子');
  ok(e.board[e.idx(4, 4)] === 0, '被提子已移出棋盘');
  ok(e.capturesBy[W] === 1, '提子计数正确');
}

{ // 禁着点：自杀
  const e = new GoEngine(9);
  e.setStones([[2, 1], [1, 2], [3, 2], [2, 3]], W);
  const r = e.play(2, 2, B, { force: true });
  ok(!r.legal && r.reason === 'suicide', '禁着点（自杀）被拦截');
}

{ // 打劫：不可立即提回
  const e = new GoEngine(9);
  e.setStones([[3, 2], [2, 3], [3, 4]], B);
  e.setStones([[4, 2], [5, 3], [4, 4], [3, 3]], W); // 白(3,3) 仅剩 (4,3) 一口气
  const r0 = e.play(4, 3, B, { force: true }); // 黑提劫
  ok(r0.legal && r0.captured.length === 1, '黑提劫成功');
  const r1 = e.play(3, 3, W, { force: true });
  ok(!r1.legal && r1.reason === 'ko', '劫争：立即提回被拦截');
  // 白先在别处落子，黑应一手后即可提回
  e.play(0, 0, W, { force: true });
  e.play(8, 8, B, { force: true });
  const r2 = e.play(3, 3, W, { force: true });
  ok(r2.legal && r2.captured.length === 1, '隔一手后提劫合法');
}

{ // 数子法
  const e = new GoEngine(9);
  // 黑占满第 4 列，白占满第 5 列
  e.setStones(Array.from({ length: 9 }, (_, y) => [4, y]), B);
  e.setStones(Array.from({ length: 9 }, (_, y) => [5, y]), W);
  const s = e.score([]);
  ok(s.terr[1] === 36 && s.terr[2] === 27, `地域划分正确（黑36/白27，实得 ${s.terr[1]}/${s.terr[2]}）`);
  ok(s.black === 45 && Math.abs(s.white - (9 + 27 + 5.5)) < 1e-9, '子数加地域与贴目计算正确');
  ok(s.winner === B && Math.abs(s.margin - 3.5) < 1e-9, '黑胜 3.5 目判定正确');
}

{ // 悔棋
  const e = new GoEngine(9);
  e.play(4, 4, B);
  e.play(3, 3, W);
  e.undo();
  ok(e.at(3, 3) === 0 && e.turn === W, '悔棋恢复局面与行棋方');
  e.play(2, 2, W);
  ok(e.at(2, 2) === W, '悔棋后可继续对局');
}

{ // 让子
  const e = new GoEngine(9, { handicap: 3 });
  ok(e.turn === W, '让子局白先行');
  let n = 0;
  for (let i = 0; i < 81; i++) if (e.board[i]) n++;
  ok(n === 3, '让三子已布好');
}

console.log('— AI 自对弈 —');
for (const lvl of [0, 1, 3]) {
  const e = new GoEngine(9);
  let color = B, moves = 0, passes = 0, caps = 0;
  const t0 = Date.now();
  while (!e.over && moves < 160) {
    const mv = GoAI.chooseMove(e, color, lvl);
    if (mv.pass) { e.pass(color, { force: true }); if (++passes >= 2) break; }
    else { const r = e.play(e.xy(mv.idx)[0], e.xy(mv.idx)[1], color, { force: true }); if (!r.legal) throw new Error('AI 落了非法一手: ' + JSON.stringify(e.xy(mv.idx))); caps += r.captured.length; passes = 0; }
    color = color === B ? W : B;
    moves++;
  }
  const dt = Date.now() - t0;
  ok(true, `级别 ${lvl}（${GoAI.LEVELS[lvl].label}）：${moves} 手，提子 ${caps} 累计，用时 ${dt}ms，终局=${e.over}`);
  const s = e.score([]);
  ok(Number.isFinite(s.black + s.white), `级别 ${lvl} 终局数子正常（黑 ${s.black} / 白 ${s.white}）`);
}

{ // AI 不会填自己的真眼
  const e = new GoEngine(9);
  // 黑大块棋围出中央真眼 (3,3)
  const black = [[2,2],[3,2],[4,2],[2,3],[4,3],[2,4],[3,4],[4,4]];
  e.setStones(black, B);
  e.setStones([[0,0]], W);
  let filled = false;
  for (let t = 0; t < 40; t++) {
    const mv = GoAI.chooseMove(e, B, 3);
    if (mv.pass) break;
    if (mv.idx === e.idx(3, 3)) { filled = true; break; }
    const [x, y] = e.xy(mv.idx);
    if (!e.play(x, y, B, { force: true }).legal) break;
    // 白随手应
    const wm = GoAI.chooseMove(e, W, 3);
    if (wm.pass) break;
    const [wx, wy] = e.xy(wm.idx);
    if (!e.play(wx, wy, W, { force: true }).legal) break;
  }
  ok(!filled, '高级 AI 不填自家真眼');
}

console.log('- 名局谱数据 -');
{
  ok(KIFU && KIFU.count >= 100, `收录棋谱不少于 100 局（实得 ${KIFU.count} 局）`);
  ok(KIFU.games.every(g => g.s && g.s.length % 2 === 0), '着法流长度均为偶数');
  const years = KIFU.games.map(g => g.y).filter(Boolean);
  ok(Math.min(...years) >= 1600 && Math.max(...years) <= 2020, `对局年份区间合理（${Math.min(...years)}–${Math.max(...years)}）`);

  // 全量重放：布子 + 逐手走子，任何非法着都视为数据损坏
  let replayed = 0, stones = 0;
  for (const g of KIFU.games) {
    const e = new GoEngine(19);
    if (g.ab) {
      for (let k = 0; k < g.ab.length; k += 2) {
        e.board[e.idx(g.ab.charCodeAt(k) - 97, g.ab.charCodeAt(k + 1) - 97)] = B;
      }
      e.positionHistory = [e._boardString(e.board)];
    }
    let color = g.hc ? W : B;
    for (let k = 0; k < g.s.length; k += 2) {
      const c1 = g.s[k], c2 = g.s[k + 1];
      if (c1 === 'z' && c2 === 'z') {
        e.pass(color, { force: true });
      } else {
        const x = c1.charCodeAt(0) - 97, y = c2.charCodeAt(0) - 97;
        const r = e.play(x, y, color, { force: true });
        if (!r.legal) throw new Error(`棋谱 ${g.b} vs ${g.w}（${g.dt || ''}）第 ${k / 2 + 1} 手 (${x},${y}) 非法`);
        stones += r.captured.length;
      }
      color = color === B ? W : B;
    }
    replayed++;
  }
  ok(replayed === KIFU.count, `全部 ${replayed} 局重放通过规则引擎校验（累计提子 ${stones}）`);
}

console.log(failed === 0 ? '\n全部通过 ✓' : `\n${failed} 项失败 ✗`);
process.exit(failed === 0 ? 0 : 1);
