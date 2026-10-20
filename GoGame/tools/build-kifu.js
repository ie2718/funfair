/* ============================================================
   弈 · 名局库构建脚本（Node，构建期使用，不随应用分发）
   读取 SGF 棋谱 -> 用规则引擎逐手校验 -> 输出 js/kifu-data.js

   用法：node tools/build-kifu.js [SGF 目录...] （默认 /tmp/kifu_src）
   棋谱来源（公有领域 / 官方发布）：
     - CWI/Brouwer 公共档案（经 benjaminmantle/baduk-study-material 镜像）
     - DeepMind AlphaGo 官方对局记录
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

require('../js/engine.js');
const GoEngine = globalThis.GoEngine;
const B = GoEngine.BLACK, W = GoEngine.WHITE;

/* ---------- 参数 ---------- */
const ROOTS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['/tmp/kifu_src/extracted', '/tmp/kifu_src/ai-era'];
const OUT = path.join(__dirname, '..', 'js', 'kifu-data.js');
const TARGET = 130;          // 目标局数（>=100，留余量）
const MAX_PER_COLLECTION = 22; // 每位棋手/合集最多收录局数，保证多样性

/* ---------- 棋手中文名 ---------- */
const NAME_ZH = {
  'Honinbo Shusaku': '本因坊秀策', 'Yasuda Shusaku': '安田秀策',
  'Honinbo Dosaku': '本因坊道策', 'Honinbo Jowa': '本因坊丈和',
  'Kadono Jowa': '葛野丈和',
  'Go Seigen': '吴清源', 'Kitani Minoru': '木谷实',
  'Sakata Eio': '坂田荣男', 'Fujisawa Hosai': '藤泽朋斋',
  'Fujisawa Kuranosuke': '藤泽库之助', 'Fujisawa Shuko': '藤泽秀行',
  'Hashimoto Utaro': '桥本宇太郎', 'Iwamoto Kaoru': '岩本薰',
  'Takagawa Shukaku': '高川格', 'Takagawa Kaku': '高川格',
  'Shusai Meijin': '秀哉名人', 'Tamura Hoju (later Shusai)': '田村保寿（后之秀哉）',
  'Tamura Hoju': '田村保寿', 'Shusai': '秀哉',
  'Nakamura Sumire': '仲邑菫',
  'Ota Yuzo': '太田雄藏', 'Hattori Rittetsu': '服部立诚',
  'Miyashita Shuyo': '宫下秀洋', 'Yasui Chitetsu': '安井知得',
  'Hirose Heijiro': '广濑平治郎', 'Ishii Senji': '石井千治',
  'Maeda Nobuaki': '前田陈尔', 'Shimamura Toshihiro': '岛村利博',
  'Hasegawa Akira': '长谷川章', 'Iwasa Kei': '岩濑奎',
  'Inoue Shusaku': '井上秀策', 'Yasui Sanchi': '安井算知',
  'Sakaguchi Sentoku': '坂口仙得', 'Sanai Tokujiro': '算知德次郎',
  'Akaboshi Intetsu': '赤星因彻', 'Okubo Chogen': '大久保得根',
  'Inoue Inseki': '井上因硕', 'Karigane Junichi': '雁金准一',
  'Segoe Kensaku': '濑越宪作', 'Minoru Kitani': '木谷实',
  'Cho Utaro': '桥本宇太郎',
  'AlphaGo': 'AlphaGo', 'Master': 'Master（AlphaGo）', 'Magist': 'Magist（AlphaGo）',
  'Lee Sedol': '李世石', 'Ke Jie': '柯洁', 'Fan Hui': '樊麾',
  'Gu Li': '古力', 'Chen Yaoye': '陈耀烨', 'Mi Yuting': '芈昱廷',
  'Tang Weixing': '唐韦星', 'Lian Xiao': '连笑', 'Zhou Ruiyang': '周睿羊',
  'Nie Weiping': '聂卫平', 'Iyama Yuta': '井山裕太', 'Park Jung-hwan': '朴廷桓',
  'Kim Ji-seok': '金志锡', 'Shin Jin-seo': '申真谞', 'Gu Zihao': '顾子豪',
  'Shi Yue': '时越', 'Tan Xiao': '檀啸', 'Yang Dingxin': '杨鼎新',
  'Fan Tingyu': '范廷钰', 'Chang Hao': '常昊', 'Dang Yifei': '党毅飞',
  'Tuo Jiaxi': '柁嘉熹', 'Jiang Weijie': '江维杰', 'Huang Yunsong': '黄云嵩',
  'Yu Zhiying': '於之莹', 'Meng Tailing': '孟泰龄', 'Han Yizou': '韩一洲',
  'Xie Erhao': '谢尔豪', 'Li Qincheng': '李钦诚', 'Li Xiangyu': '李翔宇',
  'Kang Dong-yun': '姜东润', 'Weon Seong-jin': '元晟溱', 'An Sung-joon': '安成浚',
  'Park Yeong-hun': '朴永训', 'Cho Han-seung': '赵汉乘', 'Zhou Junxun': '周俊勋',
  'Yamashita Keigo': '山下敬吾', 'An Jungki': '安成铉',
  'Honinbo Genjo': '本因坊元丈', 'Okunuki Chisaku': '奥贯智策',
  'NN': 'Master（AlphaGo）',
  'Yasui Sanchi IX': '安井算知', 'Yasuda Shusaku 7d': '安田秀策',
  'Ishida Yoshio': '石田芳夫', 'Ohira Shuzo': '大平修三',
  'Sakata Eio 9d': '坂田荣男', 'Kato Masao': '加藤正夫',
  'Rin Kaiho': '林海峰', 'Cho Chikun': '赵治勋',
  'Sugiuchi Masaaki': '杉内雅男', 'Ogata Masakazu': '小林觉',
  'Yamabe Toshiro': '山部俊郎', 'Honda Kuniharu': '本田邦久',
  'Takagawa Shukaku 9d': '高川格',
  // —— 补充（江户/明治常见对手与现代棋手，未及考证的保留罗马字）——
  'Honinbo Shusai': '本因坊秀哉', 'Honinbo Doetsu': '本因坊道悦',
  'Honinbo Shuei': '本因坊秀荣', 'Inoue Dosa Inseki': '井上道节因硕',
  'Shusai Honinbo': '本因坊秀哉', 'Honinbo Shusai Meijin': '本因坊秀哉（名人）',
  'Suzuki Tamejiro': '铃木为次郎', 'Yasui San\'ei': '安井算英',
  'Wang Yunfeng': '王云峰', 'Wang Youchen': '王幼宸', 'Lei Puhua': '雷溥华',
  'KeJie': '柯洁', 'Magister': 'Master（AlphaGo）', 'Men Tailing': '孟泰龄',
  'Li Xiangyu': '李翔宇',
};

/* ---------- 事件中文名 ---------- */
const EV_ZH = {
  'Castle Game': '御城棋', 'Oteai': '大手合', 'Free Game': '自由对局',
  'Teaching game': '指导棋', 'Fox game': '网络对局',
  "Shusai's Retirement Game": '秀哉引退棋',
  '10-game match': '十番棋', '20-game match': '二十番棋',
  '30-game match': '三十番棋', '21-game match': '二十一碁',
  '11-game match': '十一番棋', '6-game match': '六番棋',
  'three-game match': '三番棋',
  'Jiji Go Tournament (win-and-continue)': '时事新报胜续战',
  'Rising Stars win-and-continue tournament': '新星胜续战',
  '1st Meijin Tournament': '第一届名人战',
};

function playerZh(name) {
  if (!name) return '不详';
  const n = name.trim();
  if (NAME_ZH[n]) return NAME_ZH[n];
  if (n === 'AlphaGo' || /alpha\s*go/i.test(n)) return 'AlphaGo';
  if (NAME_ZH[n.replace(/ \(.*\)$/, '')]) return NAME_ZH[n.replace(/ \(.*\)$/, '')];
  return n;
}
function evZh(ev, year) {
  if (!ev) return '';
  const e = ev.trim();
  if (EV_ZH[e]) return EV_ZH[e];
  // AlphaGo 系列专译
  if (/AlphaGo vs Fan Hui/i.test(e)) return 'AlphaGo 对樊麾五番棋';
  if (/AlphaGo vs Lee Sedol/i.test(e)) return 'AlphaGo 对李世石五番棋';
  if (/wuzhen|Ke Jie/i.test(e)) return '乌镇围棋峰会';
  if (/master.*series|master series/i.test(e)) return 'Master 网络快棋六十局';
  if (/selfplay|self-play/i.test(e)) return 'AlphaGo 自对弈';
  const m = e.match(/^(\d+)-(game|board) match$/);
  if (m) return `${m[1]}番棋`;
  return e;
}
/* 无 EV 时按文件名推断事件（AlphaGo 系列文件名含日期与对手） */
function evFromFilename(fname, pb, pw) {
  const base = fname.toLowerCase();
  if (/master|magist/.test(base)) return 'Master 网络快棋六十局';
  if (/lee.?sedol/.test(base)) return 'AlphaGo 对李世石五番棋';
  if (/fan.?hui/.test(base)) return 'AlphaGo 对樊麾五番棋';
  if (/wuzhen|kejie|ke.?jie/.test(base)) return '乌镇围棋峰会';
  if (/ag.?vs.?ag|selfplay/.test(base)) return 'AlphaGo 自对弈';
  return '';
}
function eraOf(year, isAI) {
  if (isAI) return 6;                  // AlphaGo 系列一律归 AI 时代
  if (!year || year < 1700) {
    // 无年份的古谱按 JD（日本年号）推断；未知归入江户
    return 1;
  }
  if (year <= 1867) return 1;       // 江户（古代）
  if (year <= 1911) return 2;       // 明治
  if (year <= 1925) return 3;       // 大正
  if (year <= 1985) return 4;       // 昭和
  if (year <= 2015) return 5;       // 平成
  return 6;                          // AI 时代
}
const ERAS = ['古今', '江户', '明治', '大正', '昭和', '平成', 'AI时代'];

/* ---------- SGF 解析 ---------- */
function parseSgf(text) {
  const root = {};
  const moves = [];
  // 仅取根节点属性 + 主线着法（跳过分支与注释）
  const s = text.replace(/\r/g, '');
  const propRe = /([A-Z]{1,2})((?:\s*\[[^\]]*\])+)/g;
  let body = s;
  let rootEnd = s.indexOf(';B[') >= 0 ? Math.min(...[s.indexOf(';B['), s.indexOf(';W[')].filter(i => i >= 0)) : s.length;
  if (!isFinite(rootEnd) || rootEnd < 0) rootEnd = s.length;
  const rootPart = s.slice(0, Math.max(rootEnd, 0));
  let m;
  while ((m = propRe.exec(rootPart))) {
    const key = m[1];
    const vals = [...m[2].matchAll(/\[([^\]]*)\]/g)].map(x => x[1]);
    if (!(key in root)) root[key] = vals[0];
  }
  // 主线着法：去掉分支（保留首个分支前的主干）
  const noBranch = stripBranches(body);
  const moveRe = /;\s*([BW])\[([a-z]{0,2})\]/g;
  while ((m = moveRe.exec(noBranch))) {
    moves.push(m[1] === 'B' ? B : W, m[2] === '' ? -1 : coordToIdx(m[2]));
  }
  return { root, moves };
}
function stripBranches(s) {
  // 保留最外层棋谱树的主干（depth===1），丢弃变化图分支
  let out = '', depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(') { depth++; continue; }
    if (c === ')') { depth--; continue; }
    if (depth === 1) out += c;
  }
  return out;
}
function coordToIdx(str) {
  const x = str.charCodeAt(0) - 97;
  const y = str.charCodeAt(1) - 97;
  return y * 19 + x;
}

/* ---------- 结果格式 ---------- */
function resultZh(re) {
  if (!re) return '';
  const r = re.trim();
  if (r === '0') return '和棋';
  const m = r.match(/^([BW])\+(.+)$/);
  if (!m) return r;
  const who = m[1] === 'B' ? '黑' : '白';
  const how = m[2].toUpperCase();
  if (how === 'R' || how === 'RESIGN') return `${who}中盘胜`;
  if (how === 'T') return `${who}超时胜`;
  if (how === 'F' || how === 'FORFEIT') return `${who}不战胜`;
  if (how === 'C') return `${who}计点胜`;
  if (/^\d/.test(how)) return `${who}胜${m[2]}目`;
  return `${who}胜（${m[2]}）`;
}

/* ---------- 主流程 ---------- */
function collectSgfFiles() {
  const files = [];
  for (const root of ROOTS) {
    if (!fs.existsSync(root)) { console.warn('跳过不存在的目录:', root); continue; }
    (function walk(dir) {
      for (const name of fs.readdirSync(dir).sort()) {
        const p = path.join(dir, name);
        const st = fs.statSync(p);
        if (st.isDirectory()) walk(p);
        else if (/\.sgf$/i.test(name)) files.push(p);
      }
    })(root);
  }
  return files;
}

const files = collectSgfFiles();
console.log(`发现 SGF ${files.length} 个，开始解析与校验…`);

/* 每合集限额 + 全局名额分配 */
const perCollection = {};
const groups = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }; // 按时代
const special = []; // AlphaGo 对局（全部保留）

let checked = 0, failed = 0;
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  if (!/GM\[1\]|;\s*[BW]\[/.test(text)) continue;
  const { root, moves } = parseSgf(text);
  if (!moves.length) continue;
  const sz = parseInt(root.SZ || '19', 10);
  if (sz !== 19) continue;              // 仅收 19 路标准局

  const pb = playerZh(root.PB), pw = playerZh(root.PW);
  // 多人联棋（PB/PW 含 "&" 或超长名单）或未署名局不收录
  if (/&/.test(root.PB || '') || /&/.test(root.PW || '')) continue;
  if ((root.PB || '').length > 28 || (root.PW || '').length > 28) continue;
  const isAI = /alpha\s*go|master|magist|\bNN\b/i.test(root.PB || '') || /alpha\s*go|master|magist|\bNN\b/i.test(root.PW || '');
  let year = parseInt((root.DT || root.JD || '').slice(0, 4), 10) || 0;
  if (!year) {
    // Brouwer 档案以日期命名文件（如 1926-00-00.sgf）；AlphaGo 系列含 2016xxxx
    const fy = path.basename(f).match(/(19|20)\d{2}/);
    if (fy) year = parseInt(fy[0], 10);
  }
  const entry_year = year;
  let evName = evZh(root.EV, year);
  if (!evName && isAI) evName = evFromFilename(path.basename(f), root.PB, root.PW);

  // 合集标识：优先按代表性棋手归类，其余按时代名家归入「昭和名家/其他」
  let collection;
  if (isAI) collection = 'AlphaGo';
  else if (/秀策/.test(pb + pw)) collection = '本因坊秀策';
  else if (/道策/.test(pb + pw)) collection = '本因坊道策';
  else if (/丈和/.test(pb + pw)) collection = '本因坊丈和';
  else if (/吴清源/.test(pb + pw)) collection = '吴清源';
  else if (/高川格/.test(pb + pw)) collection = '高川格';
  else if (/秀哉|田村保寿/.test(pb + pw)) collection = '秀哉';
  else if (/仲邑菫/.test(pb + pw)) collection = '仲邑菫';
  else if (entry_year >= 1945) collection = '昭和名家';
  else if (/坂田|藤泽|木谷|桥本|岩本|前田|宫下|井上|安井|太田/.test(pb + pw)) collection = '昭和名家';
  else collection = '江户群英';

  // 名额控制
  if (collection !== 'AlphaGo') {
    perCollection[collection] = (perCollection[collection] || 0) + 1;
    if (perCollection[collection] > MAX_PER_COLLECTION) continue;
  }

  /* --- 引擎校验：逐手重放，必须全部合法 --- */
  const eng = new GoEngine(19);
  let ok = true;
  const abStones = [];
  if (root.AB) {
    // 让子/古谱星位布局：直接布子（道策等古谱偶见 AB 记录）
    for (const m of root.AB.matchAll(/[a-z]{2}/g)) {
      const i = coordToIdx(m[0]);
      if (i >= 0 && i < 361) { eng.board[i] = B; abStones.push(i); }
    }
    eng.positionHistory = [eng._boardString(eng.board)];
  }
  let n = 0;
  for (let k = 0; k < moves.length; k += 2) {
    const color = moves[k], point = moves[k + 1];
    if (point === -1) { eng.pass(color, { force: true }); n++; continue; }
    const x = point % 19, y = (point / 19) | 0;
    const r = eng.play(x, y, color, { force: true });
    if (!r.legal) { ok = false; break; }
    n++;
  }
  checked++;
  if (!ok) { failed++; continue; }
  if (n < 40) continue; // 过短的对局不收录

  const entry = {
    pb, pw,
    br: (root.BR || '').replace(/^provisional /, ''),
    wr: (root.WR || '').replace(/^provisional /, ''),
    re: resultZh(root.RE),
    ev: evZh(root.EV, year),
    date: root.DT || root.JD || '',
    year, era: eraOf(year, isAI),
    src: path.basename(f),
    moves,
    ab: abStones,
  };
  if (collection === 'AlphaGo') special.push(entry);
  else groups[entry.era].push(entry);
}

console.log(`校验完成：${checked} 局重放，失败 ${failed} 局`);
for (let e = 1; e <= 6; e++) console.log(`  时代 ${ERAS[e]}: ${groups[e].length} 局 (+AlphaGo ${special.length})`);

/* ---------- 同对手连续对局去重（每位对手最多 3 局，保留日期较均匀的样本） ---------- */
for (let e = 1; e <= 6; e++) {
  const seenPair = {};
  const keep = [];
  for (const g of groups[e]) {
    const pair = [g.pb, g.w].sort().join('|');
    seenPair[pair] = (seenPair[pair] || 0) + 1;
    if (seenPair[pair] <= 3) keep.push(g);
  }
  groups[e] = keep;
}
{
  const seenPair = {};
  const keep = [];
  for (const g of special) {
    const pair = [g.pb, g.w].sort().join('|') + '|' + (g.ev || '');
    seenPair[pair] = (seenPair[pair] || 0) + 1;
    if (seenPair[pair] <= 3) keep.push(g);
  }
  special.length = 0;
  special.push(...keep);
}
console.log(`对手去重后：` + [1, 2, 3, 4, 5, 6].map(e => `${ERAS[e]}=${groups[e].length}`).join(' ') + ` AlphaGo=${special.length}`);

/* ---------- 时代内排序 + 配额 ---------- */
const byDate = (a, b) => (a.date || a.year || '9999').localeCompare(b.date || b.year || '9999');
for (let e = 1; e <= 6; e++) groups[e].sort(byDate);

// 名额：江户40 明治18 大正18 昭和30 平成6 AI(AlphaGo全部+平成补充)
const quota = { 1: 40, 2: 18, 3: 18, 4: 30, 5: 6, 6: 0 };
const picked = [];
for (let e = 1; e <= 6; e++) picked.push(...groups[e].slice(0, quota[e]));
picked.push(...special);

/* 若不足 TARGET，从余量里补齐 */
if (picked.length < TARGET) {
  const rest = [];
  for (let e = 1; e <= 6; e++) rest.push(...groups[e].slice(quota[e]));
  rest.sort(byDate);
  picked.push(...rest.slice(0, TARGET - picked.length));
}
picked.sort((a, b) => a.year - b.year || (a.date || '').localeCompare(b.date || ''));

console.log(`计划收录：${picked.length} 局`);

/* ---------- 编码：紧凑坐标流 ---------- */
/* moves: [color, idx, color, idx...]（color 为 B/W 常量即 1/2）
   压缩：仅保留 idx，黑先白后严格交替；让子局白先行由 hc 标记，
   AB 布子点存于 ab（a-s 坐标对）。pass 用 "zz"。 */
function idxToCoord(i) {
  const x = i % 19, y = (i / 19) | 0;
  return String.fromCharCode(97 + x) + String.fromCharCode(97 + y);
}
function movesToStream(moves) {
  let s = '';
  for (let k = 0; k < moves.length; k += 2) {
    const point = moves[k + 1];
    s += point === -1 ? 'zz' : idxToCoord(point);
  }
  return s;
}

const records = picked.map((g, gi) => {
  const stream = movesToStream(g.moves);
  return {
    i: gi,
    b: g.pb, w: g.pw,
    bR: g.br, wR: g.wr,
    re: g.re, ev: g.ev,
    dt: g.date.replace(/-00-00[a-z]?/g, '').replace(/-00/g, ''),
    y: g.year || 0,
    e: g.era,
    s: stream,
    hc: g.moves[0] === W ? 1 : 0, // 让子局：白先行
    ab: (g.ab || []).map(idxToCoord).join(''),
  };
});

/* ---------- 输出 ---------- */
const header = `/* eslint-disable */
/* ============================================================
   弈 · 名局库（由 tools/build-kifu.js 生成，请勿手改）
   ${picked.length} 局真实职业对局 · 19 路中国规则
   棋谱来源：公有领域档案（CWI/Brouwer 公共档案）与 DeepMind 官方发布
   格式：s 为着法流，每手 2 字符（列+行，a-s），zz 表示停一手；
        hc=1 表示让子局（白先行，布子点见 ab）
   ============================================================ */
globalThis.KIFU = (
`;
const body = JSON.stringify({
  count: records.length,
  eras: ERAS,
  games: records,
});
const footer = `
);
`;

fs.writeFileSync(OUT, header + body + footer, 'utf8');
const size = fs.statSync(OUT).size;
console.log(`已输出 ${OUT}`);
console.log(`  ${records.length} 局 · ${(size / 1024).toFixed(1)} KB`);

/* ---------- 生成局数/棋手统计 ---------- */
const byPlayer = {};
for (const g of records) {
  byPlayer[g.b] = (byPlayer[g.b] || 0) + 1;
  byPlayer[g.w] = (byPlayer[g.w] || 0) + 1;
}
const top = Object.entries(byPlayer).sort((a, b) => b[1] - a[1]).slice(0, 12);
console.log('收录棋手 TOP12:');
for (const [p, c] of top) console.log('  ' + String(c).padStart(3) + '  ' + p);
