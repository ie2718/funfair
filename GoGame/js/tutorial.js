/* ============================================================
   弈 · 入门教程（十二章交互课程）
   ============================================================ */
(function (global) {
  'use strict';

  const G = global.GoEngine;
  const B = G.BLACK, W = G.WHITE;

  /* ---------- 课程数据 ----------
     step 字段:
       text      讲解文字
       size      棋盘路数(默认 9)
       setup     { black:[[x,y]…], white:[[x,y]…] } 初始布子
       marks     [{ x,y,type,color?,text? }]  标记: circle/dot/cross/triangle/square/letter/cell
       auto      [[x,y,color]…]  自动演示的着法序列
       scoreDemo true: 计算并展示地域
       task      { type, color, goal, hint, … }  交互练习
     task 类型:
       placeAt(points)   下在指定点
       captureAll(targets) 提净目标子
       saveGroup(seed)   让棋块逃出(≥2气)
       atariGroup(seed)  打吃指定棋块
       doubleAtari       一手双打
       ko(koPoint,reply) 体验劫争
  -------------------------------- */

  const LESSONS = [
    {
      id: 'basics', num: '壹', title: '初识棋盘', desc: '交叉点、星位与天元',
      steps: [
        {
          size: 19,
          marks: [[3, 3], [9, 9], [15, 15], [3, 15], [15, 3], [9, 3], [3, 9], [15, 9], [9, 15]].map(([x, y]) => ({ x, y, type: 'dot' })),
          text: '围棋盘由纵横各十九条线交织而成，共三百六十一个交叉点。棋子不是下在方格之中，而是落在「线的交叉点」上——这是围棋与许多棋类的第一处不同。',
        },
        {
          size: 9,
          marks: [{ x: 4, y: 4, type: 'dot' }, { x: 2, y: 2, type: 'circle' }, { x: 6, y: 2, type: 'circle' }, { x: 2, y: 6, type: 'circle' }, { x: 6, y: 6, type: 'circle' }],
          text: '为便于入门，教学中常用九路小盘。盘上的小圆点称作「星位」，正中央的星位唤作「天元」。棋谚说「金角银边草肚皮」——同样一子，落在角上效率最高。',
        },
        {
          size: 9,
          task: { type: 'placeAt', color: B, points: [[4, 4]], goal: '请执黑落子于天元（正中央的星位）', hint: '天元是棋盘正中央被小圆点标出的交叉点。' },
          text: '初次落子，请落在天元。',
        },
      ],
    },

    {
      id: 'liberty', num: '贰', title: '气与提子', desc: '棋子的呼吸与提离',
      steps: [
        {
          size: 9,
          setup: { black: [[4, 4]] },
          marks: [{ x: 3, y: 4, type: 'dot' }, { x: 5, y: 4, type: 'dot' }, { x: 4, y: 3, type: 'dot' }, { x: 4, y: 5, type: 'dot' }],
          text: '棋子在棋盘上生存，靠的是「气」——与棋子直线紧邻的空交叉点。中央一子有四口气（如图中圆点）。气数归零，棋子便无法存活。',
        },
        {
          size: 9,
          setup: { black: [[0, 4], [0, 0]] },
          marks: [{ x: 1, y: 4, type: 'dot' }, { x: 0, y: 3, type: 'dot' }, { x: 0, y: 5, type: 'dot' }, { x: 1, y: 0, type: 'dot' }, { x: 0, y: 1, type: 'dot' }],
          text: '边线之子只有三口气，角上一子仅剩两口气。地盘价值亦然：角上最小的地方最容易围出实地，这也是「金角银边草肚皮」的道理。',
        },
        {
          size: 9,
          setup: { black: [[4, 4]], white: [[3, 4], [5, 4], [4, 3]] },
          auto: [[4, 5, W]],
          text: '当棋子四面被围、最后一口气也被堵上，它便被「提离」棋盘，交由对方收走。请看：白棋收下最后一口气，黑子应声离盘。',
        },
        {
          size: 9,
          setup: { black: [[0, 0]], white: [[1, 0]] },
          task: { type: 'captureAll', color: W, targets: [[0, 0]], goal: '执白提掉角上的黑子', hint: '黑子在角上只有两口气，白已堵住一口，剩下一口在哪里？' },
          text: '轮到你了：角上黑子仅剩一口气，一手提掉它。',
        },
        {
          size: 9,
          setup: { black: [[4, 0], [5, 0]], white: [[3, 0], [4, 1], [5, 1]] },
          task: { type: 'captureAll', color: W, targets: [[4, 0], [5, 0]], goal: '执白提掉边上相连的黑两子', hint: '相连的棋子共命运。找到这两颗黑子共有的最后一口气。' },
          text: '相连的棋子构成一个整体，同呼吸、共存亡。请提掉边上这两颗黑子。',
        },
      ],
    },

    {
      id: 'atari', num: '叁', title: '打吃与长', desc: '叫吃、逃子与反打',
      steps: [
        {
          size: 9,
          setup: { black: [[2, 2], [2, 3]], white: [[1, 2], [1, 3], [3, 2], [3, 3], [2, 4]] },
          marks: [{ x: 2, y: 1, type: 'dot' }],
          text: '使对方棋子只剩一口气，称为「打吃」（也叫叫吃）。如图黑两子已被打到只剩一口气——白若再占图中圆点，黑两子将被提。',
        },
        {
          size: 9,
          setup: { black: [[2, 2], [2, 3], [2, 1]], white: [[1, 2], [1, 3], [3, 2], [3, 3], [2, 4]] },
          marks: [{ x: 1, y: 1, type: 'dot' }, { x: 3, y: 1, type: 'dot' }, { x: 2, y: 0, type: 'dot' }],
          text: '被打吃的一方可以「长」——在最后一口气处再接一子延伸出去，气数随之增多。如图黑长出后，已有三口气，暂时脱险。',
        },
        {
          size: 9,
          setup: { black: [[4, 4]], white: [[3, 4], [5, 4], [4, 3]] },
          task: { type: 'saveGroup', color: B, seed: [4, 4], goal: '执黑「长」出重围，让这颗黑子有两口以上的气', hint: '黑子只剩下方一口气，在那里长出去。' },
          text: '黑子只剩一口气了！请执黑长出重围。',
        },
        {
          size: 9,
          setup: { black: [[4, 5], [6, 5], [5, 4], [5, 7]], white: [[5, 5], [5, 6]] },
          task: { type: 'atariGroup', color: B, seed: [5, 5], goal: '执黑打吃中央的白两子（让它们只剩一口气）', hint: '白两子目前有两口气：下方左右各一。堵住其中一口便是打吃。' },
          text: '反过来，请执黑打吃中央的白两子。',
        },
      ],
    },

    {
      id: 'ko', num: '肆', title: '禁着点与劫', desc: '自杀禁手与打劫规则',
      steps: [
        {
          size: 9,
          setup: { white: [[2, 1], [1, 2], [3, 2], [2, 3]] },
          marks: [{ x: 2, y: 2, type: 'cross' }],
          text: '落子之后，若这颗子一口气息全无、又未能提掉对方任何一子，这样的点称为「禁着点」，规则不许下在这里。图中打叉处便是黑棋的禁着点。（例外：若这一手能提子，则完全可以下。）',
        },
        {
          size: 9,
          setup: { black: [[3, 2], [2, 3], [3, 4]], white: [[4, 2], [5, 3], [4, 4], [3, 3]] },
          auto: [[4, 3, B]],
          text: '「劫」是围棋最有趣的规则。请看：黑提掉白一子后，黑这颗子自己也只剩一口气。白若立刻提回，局面便回到提劫之前，如此循环永无终日。所以规则规定：提劫之后，对方不可立即提回，必须先在别处落子（寻劫材），待对方应一手后方可提回。',
        },
        {
          size: 9,
          setup: { black: [[3, 2], [2, 3], [3, 4], [4, 3]], white: [[4, 2], [5, 3], [4, 4]] },
          marks: [{ x: 3, y: 3, type: 'cell' }],
          task: { type: 'ko', color: W, koPoint: [3, 3], reply: [8, 8], goal: '执白完成一次劫争：先寻劫材，再提回黑子', hint: '先在别处落子制造劫材，待黑应一手后，即可回到劫处提子。' },
          text: '请执白亲历一次劫争：黑刚提掉你一子，直接提回会被规则拦下——先在别处寻劫材吧。',
        },
      ],
    },

    {
      id: 'eyes', num: '伍', title: '眼与死活', desc: '真眼、假眼与做活',
      steps: [
        {
          size: 9,
          setup: { black: [[2, 2], [3, 2], [4, 2], [2, 3], [4, 3], [2, 4], [3, 4], [4, 4]] },
          marks: [{ x: 3, y: 3, type: 'dot' }],
          text: '被己方棋子完全围住的空点，称作「眼」。如图黑棋围出的中央空点便是一只眼。眼的妙处在于：对方落进来便是自杀（禁着点），因而无法侵入。',
        },
        {
          size: 9,
          setup: { black: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [2, 1], [3, 1], [0, 2], [1, 2], [3, 2], [1, 3]] },
          marks: [{ x: 1, y: 1, type: 'dot' }, { x: 2, y: 2, type: 'dot' }],
          text: '一只眼还不够——整块棋若只有一只眼，对方仍可在外围层层收气，最终聚杀。唯有「两只真眼」才能永生：对方无法同时填进两只眼，这块棋便谁也杀不死。',
        },
        {
          size: 9,
          setup: { black: [[2, 2], [3, 2], [4, 2], [2, 3], [4, 3], [2, 4], [3, 4], [4, 4]], white: [[1, 1], [5, 5]] },
          marks: [{ x: 3, y: 3, type: 'dot' }],
          text: '还要提防「假眼」：斜角被白占据的眼位并不牢靠，关键时刻可能被挤掉。判断一块棋的死活，要数清它真眼的数目。',
        },
        {
          size: 9,
          setup: { black: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [2, 1], [3, 1], [0, 2], [1, 2], [3, 2], [1, 3]] },
          marks: [{ x: 1, y: 1, type: 'dot' }, { x: 2, y: 2, type: 'dot' }],
          task: { type: 'placeAt', color: B, points: [[2, 3]], goal: '执黑做出第二只眼，让整块棋活定', hint: '左上已有一只现成的眼。再围出 (2,2) 这个点，让黑棋拥有两只眼。' },
          text: '这块黑棋已有一只现成的眼。请落子做出第二只眼，让整块棋活定。',
        },
      ],
    },

    {
      id: 'tactics', num: '陆', title: '吃子技巧', desc: '双打 · 关门吃 · 征子',
      steps: [
        {
          size: 9,
          setup: { black: [[2, 3], [3, 2], [2, 5], [3, 6]], white: [[3, 3], [3, 5]] },
          marks: [{ x: 3, y: 4, type: 'cell' }],
          text: '「双打」（双叫吃）：一手棋同时打吃对方两块棋。对方顾此失彼，必失其一。如图黑若下在标亮处，两颗白子将同时被打吃。',
        },
        {
          size: 9,
          setup: { black: [[2, 3], [3, 2], [2, 5], [3, 6]], white: [[3, 3], [3, 5]] },
          task: { type: 'doubleAtari', color: B, goal: '执黑找出双打之点，一手同时打吃两颗白子', hint: '找同时与两颗白子都相邻的那一个交叉点。' },
          text: '请执黑找出双打之点。',
        },
        {
          size: 9,
          setup: { black: [[2, 1], [3, 1], [4, 2], [1, 2], [1, 3]], white: [[2, 2], [3, 2]] },
          auto: [[3, 3, B], [2, 3, W], [2, 4, B]],
          text: '「关门吃」：先封住对方的退路，再慢慢收紧，如关门捉贼。请看黑棋先镇住要冲，白两子强行冲出也无济于事，最终三子一并被擒。',
        },
        {
          size: 9,
          setup: { black: [[1, 1], [2, 0], [1, 2]], white: [[2, 1]] },
          auto: [[3, 1, B], [2, 2, W], [2, 3, B], [3, 2, W], [4, 2, B], [3, 3, W], [3, 4, B]],
          marks: [{ x: 4, y: 3, type: 'dot' }, { x: 5, y: 3, type: 'dot' }, { x: 4, y: 4, type: 'dot' }, { x: 5, y: 4, type: 'dot' }, { x: 4, y: 5, type: 'dot' }],
          text: '「征子」（扭羊头）：连续打吃，把对方一路扭向边线。请看黑棋步步紧逼，白棋越逃气越紧。切记：征子前要先看清逃跑路线上有无对方接应——若有，征子不利，反受其害。',
        },
      ],
    },

    {
      id: 'ending', num: '柒', title: '终局与数目', desc: '停手、数子法与贴目',
      steps: [
        {
          size: 9,
          setup: { black: [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6]], white: [[1, 7], [3, 7], [5, 7], [7, 5], [7, 3]] },
          text: '当双方都认为再无有价值的位置可占，便各自「停一手」（虚着）。连续两次停手之后，对局结束，进入数目环节。死子先从盘上拿掉，再开始计算。',
        },
        {
          size: 9,
          scoreDemo: true,
          setup: {
            black: Array.from({ length: 9 }, (_, y) => [4, y]),
            white: Array.from({ length: 9 }, (_, y) => [5, y]),
          },
          text: '我们采用中国规则·数子法：终局后数出各自「活棋子数 + 围住的空点」。如图，黑得左侧之地，白得右侧之地——盘上小方块即是各自的属地。',
        },
        {
          size: 9,
          scoreDemo: true,
          setup: {
            black: Array.from({ length: 9 }, (_, y) => [4, y]),
            white: Array.from({ length: 9 }, (_, y) => [5, y]),
          },
          text: '因黑先行占便宜，终局时须「贴目」补偿白方：十九路黑贴 7.5 目，九路贴 5.5 目。图中局面：黑 45 子，白 36 子加贴目 5.5 共 41.5——黑胜 3.5 目。\n\n入门七课至此圆满。棋盘之上见真章——去下一盘吧！',
        },
      ],
    },

    {
      id: 'geta', num: '捌', title: '枷吃与封', desc: '远了一路的温柔一刀',
      steps: [
        {
          size: 9,
          setup: { black: [[3, 2], [2, 3], [3, 4]], white: [[3, 3]] },
          marks: [{ x: 4, y: 3, type: 'cell' }, { x: 2, y: 2, type: 'dot' }, { x: 4, y: 2, type: 'dot' }, { x: 4, y: 4, type: 'dot' }],
          text: '「枷吃」（枷）：不紧贴着打吃，而是在隔一路的要点上一枷，把对方罩进笼中。如图黑下在标亮处，白子无论往哪边长，都逃不出这张温柔的网。',
        },
        {
          size: 9,
          setup: { black: [[3, 2], [2, 3], [3, 4]], white: [[3, 3]] },
          auto: [[4, 3, B], [4, 2, W], [5, 3, B], [4, 4, W], [4, 3, B]],
          marks: [{ x: 5, y: 3, type: 'dot' }, { x: 4, y: 4, type: 'dot' }],
          text: '请看白子的挣扎：向上长、向下长，黑都不与它硬碰，只在外围随手一封。几手过后，白子气数耗尽，枷网收紧，一子成擒。枷的妙处正在于「不追不打，围而歼之」。',
        },
        {
          size: 9,
          setup: { black: [[4, 4], [3, 5]], white: [[4, 5]] },
          marks: [{ x: 5, y: 5, type: 'cell' }],
          task: { type: 'captureAll', color: B, targets: [[4, 5]], goal: '执黑用「枷」提掉这颗白子', hint: '白子有 (5,5) 与 (4,6) 两个方向的出口。下在 (5,5)，一手罩住两个出口，再慢慢收紧。' },
          text: '轮到你了：这颗白子暂时还有几口气，但出路已被黑棋半围。请用一手枷住它。',
        },
      ],
    },

    {
      id: 'snapback', num: '玖', title: '倒扑与接不归', desc: '舍与得的智慧',
      steps: [
        {
          size: 9,
          setup: { black: [[3, 3], [4, 3], [5, 3], [3, 4], [3, 5], [5, 4], [5, 5], [4, 5]], white: [[4, 4]] },
          marks: [{ x: 4, y: 4, type: 'circle' }, { x: 4, y: 6, type: 'cell' }],
          text: '「倒扑」：明知送吃，故意送一子入虎口。如图黑下在标亮处（白虎口），白提掉这一子之后自己只剩一口气--黑再原样扑回，反提白子。以一子换数子，是最妙的「舍」。',
        },
        {
          size: 9,
          setup: { black: [[3, 3], [4, 3], [5, 3], [3, 4], [3, 5], [5, 4], [5, 5], [4, 5]], white: [[4, 4]] },
          auto: [[4, 6, B], [4, 5, W], [4, 5, B]],
          text: '请看完整过程：黑先送一子，白欣然提之；可白提子之后自身气紧，黑随即扑回，白三子（连同刚提的位置）一并被反提。倒扑成立的前提是：对方提子后会陷入打吃。',
        },
        {
          size: 9,
          setup: { black: [[6, 3], [6, 4], [6, 5]], white: [[5, 3], [5, 4], [5, 5], [4, 4]] },
          marks: [{ x: 5, y: 6, type: 'cell' }, { x: 4, y: 3, type: 'dot' }, { x: 4, y: 5, type: 'dot' }],
          text: '「接不归」：对方逃子的路上有一处断点，接也接不回来。如图白三子被打吃，白若下 (5,6) 长，黑占 (4,5) 打吃，白仍接不回 (4,3) 附近的一子--逃了半步，还是死路。',
        },
        {
          size: 9,
          setup: { black: [[6, 2], [6, 3], [6, 4], [6, 5]], white: [[5, 3], [5, 4], [5, 5]] },
          marks: [{ x: 5, y: 6, type: 'cell' }],
          task: { type: 'captureAll', color: B, targets: [[5, 3], [5, 4], [5, 5]], goal: '执黑打吃白三子，让它们「接不归」', hint: '白三子的出口在 (5,6)。堵住它，白即使接上也逃不掉。' },
          text: '请执黑收网：让这三颗白子接不归。',
        },
      ],
    },

    {
      id: 'opening', num: '拾', title: '布局之要', desc: '金角 · 银边 · 草肚皮',
      steps: [
        {
          size: 9,
          marks: [[2, 2], [6, 2], [2, 6], [6, 6], [4, 4]].map(([x, y]) => ({ x, y, type: 'circle' })),
          text: '开局之时，盘上三百六十一个交叉点皆空，先占哪里？古谚答曰「金角银边草肚皮」。角上用最少的子就能围住地盘--开局先占角，其次守边，最后才问中原。',
        },
        {
          size: 9,
          setup: { black: [[2, 2], [6, 6]], white: [[6, 2], [2, 6]] },
          text: '占角之后是「守角」与「挂角」：各占一角后，接下来通常在角部附近再补一手，把角地守牢；或者跑去对方的角旁「挂」一手，阻止其安稳成空。角部攻防，是布局阶段的主旋律。',
        },
        {
          size: 9,
          setup: { black: [[2, 2], [6, 6]], white: [[6, 2], [2, 6]] },
          auto: [[3, 3, B], [4, 2, W], [3, 4, B], [6, 4, W]],
          text: '再看行棋的次序：双方各自拆边、扎根，几手之后盘面四角各有所属。注意黑 (3,4)、白 (4,2) 这类「三线四线」的落点--三线利于取实空，四线利于取势力，高低搭配，才是好布局。',
        },
        {
          size: 9,
          setup: { black: [[2, 2], [6, 6]], white: [[6, 2], [2, 6]] },
          marks: [{ x: 3, y: 2, type: 'cell' }],
          task: { type: 'placeAt', color: B, points: [[3, 2]], goal: '执黑守角：沿三线拆一手，把左上角黑阵守牢', hint: '从 (2,2) 沿三线向右边拆开，即 (3,2)。' },
          text: '轮到你执黑：从角星出发，沿三线拆一手守角。',
        },
      ],
    },

    {
      id: 'life', num: '拾壹', title: '死活常形', desc: '直三 · 曲四 · 丁四 · 刀把五',
      steps: [
        {
          size: 9,
          setup: { black: [[2, 3], [3, 2], [4, 3], [3, 4], [2, 4], [4, 4]] },
          marks: [{ x: 3, y: 3, type: 'cell' }, { x: 2, y: 2, type: 'dot' }, { x: 4, y: 2, type: 'dot' }],
          text: '「直三」：一块棋围出三个成直线的空点。若轮到自己走，中间一点即活--两只眼随手而成；反之被对方抢先点在正中，便凶多吉少。直三、曲三，生死系于一点。',
        },
        {
          size: 9,
          setup: { black: [[2, 3], [3, 2], [4, 3], [3, 4], [2, 2], [4, 2], [2, 4], [4, 4]] },
          marks: [{ x: 3, y: 3, type: 'dot' }],
          text: '「直四」「曲四」：围出四个空点的直列或弯曲，天然是两只眼的位置--不用补棋便是活棋。记住这条铁律：直四、曲四，点不死的活形。',
        },
        {
          size: 9,
          setup: { black: [[3, 2], [2, 3], [4, 3], [3, 4], [2, 2], [4, 2], [2, 4], [4, 4]] },
          marks: [{ x: 3, y: 3, type: 'cross' }],
          text: '「丁四」「方块四」：四点围成「丁」字或方块，却都是死形！对方一一点在正中，眼位尽毁。方块四更是有趣--即使全归自己做眼，也只能做出一只真眼。子数相同，形不同，生死迥异。',
        },
        {
          size: 9,
          setup: { black: [[2, 2], [3, 2], [2, 3], [2, 4], [2, 5], [3, 4], [4, 3], [4, 2]] },
          marks: [{ x: 3, y: 3, type: 'cell' }, { x: 3, y: 5, type: 'dot' }, { x: 4, y: 4, type: 'dot' }, { x: 4, y: 5, type: 'dot' }],
          text: '「刀把五」「梅花五」：五个空点如刀形、如梅花，同样「一点即死」。但若轮到自己走，补在要害处便活。死活的要诀：先数眼位空间，再找「一点杀」与「一点活」的共用要害。',
        },
        {
          size: 9,
          setup: { black: [[2, 3], [3, 2], [4, 3], [3, 4], [2, 4], [4, 4], [2, 2], [4, 2]] },
          marks: [{ x: 3, y: 3, type: 'cell' }],
          task: { type: 'placeAt', color: B, points: [[3, 3]], goal: '执黑补一手，把「直三」做成两只眼', hint: '直三的中间点，一点做活。' },
          text: '这块黑棋眼位是直三。请补在要害，一手做活。',
        },
      ],
    },

    {
      id: 'ending2', num: '拾贰', title: '官子与胜负手', desc: '收官次序 · 先手与逆收',
      steps: [
        {
          size: 9,
          setup: { black: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 0], [2, 0], [1, 4], [2, 4]], white: [[8, 4], [8, 5], [8, 6], [8, 7], [8, 8], [7, 4], [6, 4], [7, 8]] },
          marks: [{ x: 1, y: 5, type: 'dot' }, { x: 1, y: 6, type: 'dot' }, { x: 2, y: 5, type: 'dot' }, { x: 2, y: 6, type: 'dot' }, { x: 3, y: 6, type: 'dot' }],
          text: '中盘战罢、边界未定，最后的收束便是「官子」。如图黑白各据一边，中间的空点就是双方的官子。收官讲究先后手：一手之后对方必须应的叫「先手官」，可以白得便宜；对方不应也不亏的叫「后手官」，价值减半。',
        },
        {
          size: 9,
          setup: { black: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 0], [2, 0], [1, 4], [2, 4]], white: [[8, 4], [8, 5], [8, 6], [8, 7], [8, 8], [7, 4], [6, 4], [7, 8]] },
          text: '收官的次序口诀：先手官子抢先走，双方先手必争，然后从大到小收后手官。同一盘棋，官子次序不同，胜负常常翻盘。职业棋手算官子，能精确到「一目半」。',
        },
        {
          size: 9,
          setup: {
            black: Array.from({ length: 9 }, (_, y) => [4, y]),
            white: Array.from({ length: 9 }, (_, y) => [5, y]),
          },
          scoreDemo: true,
          text: '最后一课回到数目：棋盘之上，每一子、每一目都清清楚楚。学会收官与计算，你便拥有了判断「此刻谁优谁劣」的眼睛。\n\n入门十二课至此圆满。棋道漫长，愿君常复盘、常打谱--「名局」里一百三十局大师手谈，正待你逐一研习。',
        },
      ],
    },
  ];

  /* ---------- 控制器 ---------- */

  const PROGRESS_KEY = 'yi.progress.v1';

  const Tutorial = {
    view: null,
    engine: null,
    li: 0, si: 0,
    task: null, taskDone: false, locked: false,
    koStage: 0,
    _timers: [],

    init(view) {
      this.view = view;
      view.ghostProvider = () => (this.task && !this.taskDone && !this.locked) ? this.task.color : 0;
      view.onTap = (idx) => this.onTap(idx);
      const $ = (s) => document.querySelector(s);
      $('#btn-ls-prev').addEventListener('click', () => this.nav(-1));
      $('#btn-ls-next').addEventListener('click', () => this.nav(1));
      $('#btn-ls-retry').addEventListener('click', () => this.showStep(this.si));
      $('#btn-ls-hint').addEventListener('click', () => {
        const hintEl = $('#lesson-hint');
        hintEl.textContent = this.task && this.task.hint ? this.task.hint : '这一步自由体会即可。';
        hintEl.classList.add('show');
      });
      $('#btn-ls-exit').addEventListener('click', () => global.App.show('screen-learn'));
      const nav = $('#lesson-nav');
      LESSONS.forEach((_, i) => {
        const chip = document.createElement('button');
        chip.className = 'ln-chip';
        chip.textContent = i + 1;
        chip.addEventListener('click', () => this.openLesson(i));
        nav.appendChild(chip);
      });
    },

    lessons() { return LESSONS; },

    progress() {
      try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); } catch (e) { return {}; }
    },
    saveProgress(id) {
      const p = this.progress();
      p[id] = true;
      try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch (e) { /* 忽略 */ }
    },

    openLesson(i) {
      this.li = Math.max(0, Math.min(LESSONS.length - 1, i));
      this.showStep(0);
      const L = LESSONS[this.li];
      document.querySelector('#lesson-chapter').textContent = `第${L.num}章 · ${L.title}`;
      document.querySelectorAll('#lesson-nav .ln-chip').forEach((c, j) => {
        c.classList.toggle('on', j === this.li);
        c.classList.toggle('done', !!this.progress()[LESSONS[j].id]);
      });
      global.App.show('screen-lesson');
    },

    nav(dir) {
      const L = LESSONS[this.li];
      const next = this.si + dir;
      if (next < 0) { if (this.li > 0) { this.openLesson(this.li - 1); } return; }
      if (next >= L.steps.length) {
        this.saveProgress(L.id);
        const last = this.li >= LESSONS.length - 1;
        if (last) {
          global.App.toast('十二课已毕，棋道初成。去名局与对弈中印证所学吧！', 'success');
        } else {
          global.App.toast(`第${L.num}章完成！`, 'success');
          this.openLesson(this.li + 1);
        }
        return;
      }
      this.showStep(next);
    },

    clearTimers() {
      this._timers.forEach(clearTimeout);
      this._timers = [];
    },

    showStep(i) {
      this.clearTimers();
      const L = LESSONS[this.li];
      this.si = Math.max(0, Math.min(L.steps.length - 1, i));
      const st = L.steps[this.si];

      const size = st.size || 9;
      this.engine = new G(size);
      if (st.setup) {
        if (st.setup.black) this.engine.setStones(st.setup.black, B);
        if (st.setup.white) this.engine.setStones(st.setup.white, W);
      }
      this.view.setSize(size);
      this.view.setBoard(this.engine.board);
      this.view.marks = st.marks || [];
      this.view.territory = [];

      // 文本与界面
      document.querySelector('#lesson-text').textContent = st.text || '';
      const hintEl = document.querySelector('#lesson-hint');
      hintEl.classList.remove('show');
      hintEl.textContent = '';
      const goalEl = document.querySelector('#lesson-goal');
      if (st.task) {
        goalEl.textContent = '目标 · ' + st.task.goal;
        goalEl.style.display = 'inline-block';
        document.querySelector('#btn-ls-hint').style.display = '';
      } else {
        goalEl.style.display = 'none';
        document.querySelector('#btn-ls-hint').style.display = 'none';
      }

      // 任务状态
      this.task = st.task || null;
      this.taskDone = !st.task;
      this.koStage = 0;
      this.locked = !!st.auto && st.auto.length > 0;
      this._updateNav();

      // 步骤圆点
      const dots = document.querySelector('#lesson-step-dots');
      dots.innerHTML = '';
      L.steps.forEach((_, j) => {
        const d = document.createElement('span');
        d.className = 'step-dot' + (j === this.si ? ' on' : '') + (j < this.si ? ' past' : '');
        dots.appendChild(d);
      });

      this._hideStamp();

      // 数子演示
      if (st.scoreDemo) {
        const r = this.engine.score([]);
        this.view.territory = [...r.terrMap].map((owner, idx) => owner ? {
          x: idx % size, y: (idx / size) | 0, color: owner,
        } : null).filter(Boolean);
      }

      this.view.requestRender();

      // 自动演示着法
      if (st.auto && st.auto.length) {
        st.auto.forEach((mv, k) => {
          this._timers.push(setTimeout(() => this._autoMove(mv), 900 + k * 850));
        });
        this._timers.push(setTimeout(() => {
          this.locked = false;
          this._updateNav();
        }, 900 + st.auto.length * 850));
      }
    },

    _autoMove(mv) {
      const [x, y, color] = mv;
      const r = this.engine.play(x, y, color, { force: true });
      if (!r.legal) return;
      const idx = this.engine.idx(x, y);
      this.view.setBoard(this.engine.board, idx);
      this.view.animatePlace(idx, color);
      global.Sfx.stone();
      if (r.captured.length) {
        this.view.animateCapture(r.captured, color === B ? W : B);
        global.Sfx.capture();
        this._timers.push(setTimeout(() => this.view.requestRender(), 300));
      }
    },

    onTap(idx) {
      if (!this.task || this.taskDone || this.locked) return;
      const t = this.task;
      const [x, y] = this.engine.xy(idx);
      const size = this.engine.size;

      // 劫争任务特殊流程
      if (t.type === 'ko') {
        const koIdx = this.engine.idx(t.koPoint[0], t.koPoint[1]);
        if (this.koStage === 0 && idx === koIdx) {
          global.Sfx.error();
          global.App.toast('打劫：提子后不可立即提回。请先在别处落子寻劫材。', 'error');
          return;
        }
        const r = this.engine.play(x, y, t.color, { force: true });
        if (!r.legal) { this._illegal(r.reason); return; }
        this._afterUserMove(idx, t.color, r);
        if (this.koStage === 0) {
          this.koStage = 1;
          this._timers.push(setTimeout(() => {
            const rr = this.engine.play(t.reply[0], t.reply[1], B, { force: true });
            if (rr.legal) {
              const ridx = this.engine.idx(t.reply[0], t.reply[1]);
              this.view.setBoard(this.engine.board, ridx);
              this.view.animatePlace(ridx, B);
              global.Sfx.stone();
            }
            global.App.toast('黑已应一手——现在可以提回了！', 'info');
          }, 800));
        } else if (idx === koIdx) {
          this._taskSuccess('劫已提回，规则尽在掌中。');
        }
        return;
      }

      const r = this.engine.play(x, y, t.color, { force: true });
      if (!r.legal) { this._illegal(r.reason); return; }
      this._afterUserMove(idx, t.color, r);

      // 校验
      const self = this;
      const seedIdx = t.seed ? this.engine.idx(t.seed[0], t.seed[1]) : -1;
      let pass = false, praise = '';

      if (t.type === 'placeAt') {
        pass = t.points.some(([px, py]) => this.engine.at(px, py) === t.color);
        praise = '正是此处！';
      } else if (t.type === 'captureAll') {
        pass = t.targets.every(([px, py]) => this.engine.at(px, py) === 0);
        praise = `提子成功，共提 ${t.targets.length} 子。`;
      } else if (t.type === 'saveGroup') {
        if (this.engine.board[seedIdx] === 0) pass = false;
        else {
          const g = this.engine.groupAt(seedIdx);
          pass = g.libs.size >= 2;
        }
        praise = '长出之后，气数已足。';
      } else if (t.type === 'atariGroup') {
        if (this.engine.board[seedIdx] === 0) { pass = true; praise = '直接提掉，更胜一筹！'; }
        else {
          const g = this.engine.groupAt(seedIdx);
          pass = g.libs.size === 1;
          praise = '打吃成立。';
        }
      } else if (t.type === 'doubleAtari') {
        const oppColor = t.color === B ? W : B;
        let cnt = 0;
        const seen = new Set();
        for (let i = 0; i < size * size; i++) {
          if (this.engine.board[i] !== oppColor || seen.has(i)) continue;
          const g = this.engine.groupAt(i);
          g.stones.forEach(s => seen.add(s));
          if (g.libs.size <= 1) cnt++;
        }
        pass = cnt >= 2;
        praise = '双打！两头打吃，白顾此失彼。';
      }

      if (pass) this._taskSuccess(praise);
      else {
        global.Sfx.error();
        global.App.toast('尚未达成目标——点「重来」再试一次。', 'error');
        document.querySelector('#btn-ls-retry').classList.add('urge');
      }
    },

    _afterUserMove(idx, color, r) {
      this.view.setBoard(this.engine.board, idx);
      this.view.animatePlace(idx, color);
      global.Sfx.stone();
      if (r.captured && r.captured.length) {
        this.view.animateCapture(r.captured, color === B ? W : B);
        global.Sfx.capture();
      }
    },

    _illegal(reason) {
      global.Sfx.error();
      const msg = { occupied: '此处已有棋子。', suicide: '禁着点：落子后无气且不能提子。', ko: '打劫：不可立即提回。' }[reason] || '此处不可落子。';
      global.App.toast(msg, 'error');
    },

    _taskSuccess(praise) {
      this.taskDone = true;
      global.Sfx.success();
      this._showStamp();
      this._updateNav();
      if (praise) global.App.toast(praise, 'success');
    },

    _showStamp() {
      const st = document.querySelector('#lesson-stamp');
      st.classList.remove('show');
      void st.offsetWidth; // 重启动画
      st.classList.add('show');
    },
    _hideStamp() {
      document.querySelector('#lesson-stamp').classList.remove('show');
    },

    _updateNav() {
      const L = LESSONS[this.li];
      document.querySelector('#btn-ls-prev').disabled = (this.li === 0 && this.si === 0);
      document.querySelector('#btn-ls-next').disabled = !this.taskDone;
      document.querySelector('#btn-ls-retry').classList.remove('urge');
      document.querySelector('#btn-ls-retry').style.visibility = this.task ? '' : 'hidden';
      document.querySelector('#lesson-count').textContent = `${this.si + 1} / ${L.steps.length}`;
    },

    renderList(el) {
      const prog = this.progress();
      el.innerHTML = '';
      LESSONS.forEach((L, i) => {
        const card = document.createElement('button');
        card.className = 'lesson-card';
        card.innerHTML = `
          <span class="lc-num">${L.num}</span>
          <span class="lc-body">
            <span class="lc-title">${L.title}</span>
            <span class="lc-desc">${L.desc}</span>
          </span>
          <span class="lc-state">${prog[L.id] ? '<i class="seal-mini">已习</i>' : '<em>' + (i + 1) + '</em>'}</span>`;
        card.addEventListener('click', () => this.openLesson(i));
        el.appendChild(card);
      });
    },
  };

  global.Tutorial = Tutorial;
})(typeof window !== 'undefined' ? window : globalThis);
