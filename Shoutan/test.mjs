// 手谈引擎冒烟测试:node test.mjs
// 原理:从 index.html 提取 <script>,在 Node 中执行(boot 有 document 守卫),对纯函数引擎断言。
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const js = html.match(/<script>([\s\S]*)<\/script>/)[1]
  .replace("const EMPTY=0,BLACK=1,WHITE=2;", "var EMPTY=0,BLACK=1,WHITE=2;")
  .replace('const COLS="ABCDEFGHJKLMNOPQRST";', 'var COLS="ABCDEFGHJKLMNOPQRST";')
  .replace("const LESSONS=[", "var LESSONS=[")
  .replace("const PUZZLES=[", "var PUZZLES=[");
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
assert(play(setup([W(0, 6), W(0, 7), B(0, 5), B(0, 8), B(1, 6)]), 1 * 9 + 7, BLACK).captured.length === 2, "题p1 边路双提");
const p2 = setup([W(3, 4), W(4, 3), W(4, 5), B(2, 4), B(3, 3), B(3, 5), B(4, 2), B(4, 6), B(5, 3)]);
assert(play(p2, 4 * 9 + 4, BLACK).captured.length === 2, "题p2 一石二鸟");

// —— 新增题:角上拔子(p6) ——
const p6 = setup([W(8, 0), B(8, 1)]);
assert(play(p6, 7 * 9 + 0, BLACK).captured.length === 1, "题p6 角上拔子");

// —— 新增题:关门吃(p7) ——
const p7 = setup([W(3, 3), W(4, 3), B(2, 3), B(3, 2), B(5, 3), B(4, 2), B(2, 4), B(5, 4), B(4, 5)]);
assert(play(p7, 3 * 9 + 4, BLACK).captured.length === 0, "题p7 关门第一手收紧气");
doPass(p7);
const p7c = play(p7, 4 * 9 + 4, BLACK);
assert(p7c && p7c.captured.length === 2, "题p7 关门后全歼两子");

// —— 直三做眼(p3)/ 曲三做眼(p5) ——
const p5 = setup([B(1, 0), B(2, 0), B(2, 1), B(2, 2), B(1, 2), B(0, 2), W(0, 3), W(1, 3), W(2, 3), W(3, 0), W(3, 1), W(3, 2)]);
assert(play(p5, 0 * 9 + 1, BLACK) && countTrueEyes(p5.board, BLACK, 9) === 2, "题p5 曲三点眼");

// —— 新增题:丁四点眼(p8) ——
const p8 = setup([
  B(6, 3), B(6, 4), B(6, 5), B(6, 6), B(7, 3), B(7, 7),
  B(8, 3), B(8, 4), B(8, 6), B(8, 7), W(0, 0), W(0, 1),
]);
assert(countTrueEyes(p8.board, BLACK, 9) === 0, "题p8 丁四未点无真眼");
play(p8, 7 * 9 + 5, BLACK);
assert(countTrueEyes(p8.board, BLACK, 9) === 3, "题p8 丁四点中心成三眼");

// —— 新增题:征吃(p9,完整梯式) ——
const p9 = setup([W(2, 2), B(1, 2), B(2, 3), B(3, 3), B(4, 3), B(5, 3), B(6, 3), B(7, 3), B(8, 3)]);
let ladderOK = true;
try {
  play(p9, 2 * 9 + 1, BLACK); // 打吃
  const w1 = play(p9, 3 * 9 + 2, WHITE); // 白逃
  if (w1) {
    play(p9, 3 * 9 + 1, BLACK); // 再打
    play(p9, 4 * 9 + 2, WHITE);
    play(p9, 4 * 9 + 1, BLACK);
    play(p9, 5 * 9 + 2, WHITE);
    play(p9, 5 * 9 + 1, BLACK);
    play(p9, 6 * 9 + 2, WHITE);
    play(p9, 6 * 9 + 1, BLACK);
    play(p9, 7 * 9 + 2, WHITE);
    play(p9, 7 * 9 + 1, BLACK);
    play(p9, 8 * 9 + 2, WHITE); // 沿边逃,仅一气
    const fin = play(p9, 8 * 9 + 1, BLACK);
    ladderOK = !!fin && fin.captured.length === 7;
  } else ladderOK = false;
} catch { ladderOK = false; }
assert(ladderOK, "题p9 征吃一路押到边线全歼七子");

// —— 新增题:倒扑(p10,环形白棋) ——
const p10 = setup([
  W(3, 3), W(3, 4), W(3, 5), W(4, 3), W(4, 5), W(5, 3), W(5, 5), W(6, 3), W(6, 4), W(6, 5),
  B(2, 2), B(2, 3), B(2, 4), B(2, 5), B(2, 6), B(3, 2), B(3, 6), B(4, 2), B(4, 6),
  B(5, 2), B(5, 6), B(6, 2), B(6, 6), B(7, 2), B(7, 3), B(7, 4), B(7, 5), B(7, 6),
]);
const throwIn = play(p10, 4 * 9 + 4, BLACK);
assert(throwIn && throwIn.captured.length === 0 && getGroup(p10.board, 4 * 9 + 4, 9).libs.size === 1, "题p10 扑:送吃一子合法且仅一气");
const wCap = play(p10, 5 * 9 + 4, WHITE);
assert(wCap && wCap.captured.length === 1, "题p10 白棋提掉扑入之子");
assert(getGroup(p10.board, 3 * 9 + 3, 9).libs.size === 1, "题p10 白整块只剩一口气");
const reCap = play(p10, 4 * 9 + 4, BLACK);
assert(reCap && reCap.captured.length >= 3, "题p10 原位回提,整块倒扑全歼");

// —— 新增题:点杀弯三(p11) ——
const p11 = setup([
  W(1, 4), W(1, 5), W(1, 6), W(2, 4), W(2, 6), W(3, 4), W(4, 4), W(4, 5), W(4, 6),
  B(0, 3), B(0, 4), B(0, 5), B(0, 6), B(0, 7), B(1, 3), B(1, 7), B(2, 3), B(2, 7),
  B(3, 3), B(3, 7), B(4, 3), B(4, 7), B(5, 3), B(5, 4), B(5, 5), B(5, 6),
]);
assert(play(p11, 3 * 9 + 5, BLACK).captured.length === 0, "题p11 弯心点入合法且无所得");
assert(getGroup(p11.board, 1 * 9 + 4, 9).libs.size === 2, "题p11 点要害后白大眼仅剩两气");
doPass(p11);
play(p11, 2 * 9 + 5, BLACK);
assert(getGroup(p11.board, 1 * 9 + 4, 9).libs.size <= 1, "题p11 再收紧一气,白大眼被点死(kill 判定成立)");
doPass(p11);
const p11f = play(p11, 3 * 9 + 6, BLACK);
assert(p11f && p11f.captured.length === 9, "题p11 继续紧气可全歼九子");

// —— 课程/题库数据完整性 ——
const allLessons = globalThis.LESSONS, allPuzzles = globalThis.PUZZLES;
const lIds = new Set(allLessons.map(l => l.id));
assert(lIds.size === allLessons.length && allLessons.length === 15, "学堂共 15 课且 id 唯一");
const pIds = new Set(allPuzzles.map(p => p.id));
assert(pIds.size === allPuzzles.length && allPuzzles.length === 11, "死活题共 11 题且 id 唯一");
let dataOK = true;
for (const it of [...allLessons, ...allPuzzles]) {
  const seen = new Set();
  for (const s of (it.setup || [])) {
    if (!Number.isInteger(s.p) || s.p < 0 || s.p >= 81 || seen.has(s.p)) dataOK = false;
    seen.add(s.p);
  }
}
assert(dataOK, "所有课/题的 setup 坐标合法且无重复");

// —— 虎口课(学堂第六课)交互流 ——
const tiger = setup([B(7, 3), B(7, 4), B(8, 3)]);
tiger.turn = WHITE;
const tw = play(tiger, 8 * 9 + 4, WHITE);
assert(tw && tw.captured.length === 0, "虎口:白子落入虎口合法");
const tCap = play(tiger, 8 * 9 + 5, BLACK);
assert(tCap && tCap.captured.length === 1, "虎口:黑一手提掉入虎之白子");

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
