// 手谈引擎冒烟测试:node test.mjs
// 原理:从 index.html 提取 <script>,在 Node 中执行(boot 有 document 守卫),对纯函数引擎断言。
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const js = html.match(/<script>([\s\S]*)<\/script>/)[1]
  .replace("const EMPTY=0,BLACK=1,WHITE=2;", "var EMPTY=0,BLACK=1,WHITE=2;")
  .replace('const COLS="ABCDEFGHJKLMNOPQRST";', 'var COLS="ABCDEFGHJKLMNOPQRST";');
(0, eval)(js); // 间接 eval:var/函数声明挂到全局,且 boot() 因无 document 被跳过
const { EMPTY, BLACK, WHITE } = globalThis;

let passed = 0, failed = 0;
const assert = (cond, msg) => {
  if (!cond) { failed++; console.error("✗ FAIL:", msg); process.exitCode = 1; }
  else { passed++; console.log("✓", msg); }
};
const setup = stones => { const st = newState(9); applySetup(st, stones); return st; };
const play = (st, i, c) => { const r = tryMove(st, i, c); return r.ok ? commit(st, i, r) : null; };
const B = (r, c) => ({ p: r * 9 + c, c: BLACK });
const W = (r, c) => ({ p: r * 9 + c, c: WHITE });

// —— 基础规则 ——
assert(getGroup([1, 1, 0], 0, 3).stones.length === 2, "连通块洪水填充");
assert(tryMove(setup([{ p: 0, c: BLACK }]), 0, BLACK).reason === "occupied", "已有子处禁着");

// —— 提子 ——
const cap = setup([W(8, 1), B(8, 0), B(8, 2)]);
const capRes = play(cap, 9 * 7 + 1, BLACK);
assert(capRes && capRes.captured.length === 1, "堵最后一气提子");

// —— 禁入点 ——
const su = setup([W(8, 1), W(7, 0)]);
assert(play(su, 8 * 9 + 0, BLACK) === null, "自杀点拒绝落子");
assert(tryMove(su, 8 * 9 + 0, WHITE).ok === true, "己方眼位可自填");

// —— 打劫(位置重复判定)——
const ko = setup([W(8, 4), B(8, 3), B(7, 4), B(8, 1), B(8, 2), W(8, 6), W(7, 5), W(8, 7)]);
const koCap = play(ko, 8 * 9 + 5, BLACK);
assert(koCap && koCap.captured.length === 1 && ko.ko === 8 * 9 + 4, "提劫成立");
assert(tryMove(ko, 8 * 9 + 4, WHITE).reason === "ko", "立刻回提被禁");
play(ko, 0, WHITE);
assert(tryMove(ko, 8 * 9 + 4, WHITE).ok === true, "寻劫材后可回提");
// 多子提不应被误判为劫:位置重复检查只拦“原样复原”的局面
const multi2 = setup([W(4, 4), W(4, 5), B(3, 4), B(4, 3), B(5, 4), B(5, 5), B(3, 5)]);
const mr2 = tryMove(multi2, 4 * 9 + 6, BLACK);
assert(mr2.ok === true && mr2.captured.length === 2, "一次提多子合法(不受劫限制)");

// —— 真眼统计 ——
const straight3 = setup([
  B(7, 4), B(7, 5), B(7, 6), B(7, 7), B(7, 8), B(8, 4), B(8, 8),
  W(6, 4), W(6, 5), W(6, 6), W(6, 7), W(6, 8),
]);
assert(countTrueEyes(straight3.board, BLACK, 9) === 0, "直三未点前无真眼");
play(straight3, 8 * 9 + 6, BLACK);
assert(countTrueEyes(straight3.board, BLACK, 9) === 2, "直三点眼成活");

// —— 死活题可解性 ——
assert(play(setup([W(0, 6), W(0, 7), B(0, 5), B(0, 8), B(1, 6)]), 1 * 9 + 7, BLACK).captured.length === 2, "题1 边路双提");
const p2 = setup([W(3, 4), W(4, 3), W(4, 5), B(2, 4), B(3, 3), B(3, 5), B(4, 2), B(4, 6), B(5, 3)]);
assert(play(p2, 4 * 9 + 4, BLACK).captured.length === 2, "题2 一石二鸟");
const p5 = setup([B(1, 0), B(2, 0), B(2, 1), B(2, 2), B(1, 2), B(0, 2), W(0, 3), W(1, 3), W(2, 3), W(3, 0), W(3, 1), W(3, 2)]);
assert(play(p5, 0 * 9 + 1, BLACK) && countTrueEyes(p5.board, BLACK, 9) === 2, "题5 曲三点眼");

// —— AI 完整对局冒烟 ——
for (const n of [9, 13]) {
  const st = newState(n);
  let moves = 0;
  while (st.passes < 2 && moves < n * n * 3) {
    const m = aiChoose(st, st.turn, "hard");
    if (!m || m.pass) doPass(st);
    else {
      const r = tryMove(st, m.i, st.turn);
      if (!r.ok) { assert(false, `AI 产生非法着(${r.reason})`); break; }
      commit(st, m.i, r);
    }
    moves++;
  }
  assert(st.passes >= 2, `AI 自战 ${n} 路正常终局(${moves} 手)`);
}

console.log(failed ? `\n存在失败项:${failed} / ${passed + failed}` : `\n全部通过:${passed} 项断言`);
