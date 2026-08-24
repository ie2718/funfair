/* ============================================================
   弈 · 对局控制（人机 / 双人 / 让子 / 数子 / 结果）
   ============================================================ */
(function (global) {
  'use strict';

  const G = global.GoEngine;
  const B = G.BLACK, W = G.WHITE;

  const GameCtl = {
    engine: null,
    view: null,
    cfg: null,
    scoring: false,
    scored: null,
    aiThinking: false,
    _aiTimer: 0,

    init(view) {
      this.view = view;
      view.onTap = (idx) => this.tap(idx);
      view.ghostProvider = () => {
        if (this.scoring || !this.engine || this.engine.over || this.aiThinking) return 0;
        if (this.cfg.mode === 'pvp') return this.engine.turn;
        return this.engine.turn === this.cfg.humanColor ? this.engine.turn : 0;
      };

      const $ = (s) => document.querySelector(s);
      $('#btn-undo').addEventListener('click', () => this.undo());
      $('#btn-pass').addEventListener('click', () => this.humanPass());
      $('#btn-resign').addEventListener('click', () => this.resign());
      $('#btn-score').addEventListener('click', () => this.enterScoring(false));
      $('#btn-score-confirm').addEventListener('click', () => this.confirmScore());
      $('#btn-score-resume').addEventListener('click', () => this.exitScoring());
      $('#btn-newgame').addEventListener('click', async () => {
        if (this.engine && this.engine.moveNumber > 6) {
          const okGo = await global.App.confirm('放弃当前对局，重新设置？');
          if (!okGo) return;
        }
        global.App.show('screen-setup');
      });
      $('#btn-game-home').addEventListener('click', async () => {
        if (this.engine && this.engine.moveNumber > 6 && !this.engine.over) {
          const okGo = await global.App.confirm('对局尚未结束，返回首页？');
          if (!okGo) return;
        }
        global.App.show('screen-home');
      });

      document.querySelector('#tg-coords').addEventListener('change', (e) => {
        view.showCoords = e.target.checked;
        view.requestRender();
      });
      document.querySelector('#tg-numbers').addEventListener('change', (e) => {
        view.showNumbers = e.target.checked;
        this._syncNumberMap();
        view.requestRender();
      });
      document.querySelector('#tg-sound').addEventListener('change', (e) => {
        global.Sfx.setOn(e.target.checked);
      });

      document.addEventListener('keydown', (e) => {
        if (!document.querySelector('#screen-game').classList.contains('active')) return;
        if (e.key === 'p' || e.key === 'P') this.humanPass();
        if (e.key === 'u' || e.key === 'U') this.undo();
      });
    },

    start(cfg) {
      this.cfg = cfg;
      clearTimeout(this._aiTimer);
      this.aiThinking = false;
      this.scoring = false;
      this.scored = null;
      this.engine = new G(cfg.size, { handicap: cfg.handicap || 0 });

      const v = this.view;
      v.setSize(cfg.size);
      v.setBoard(this.engine.board);
      v.territory = [];
      v.marks = [];
      v.numberMap = null;
      v.deadMarks.clear();

      // 玩家名
      const aiName = `AI · ${global.GoAI.LEVELS[cfg.level].label}`;
      if (cfg.mode === 'ai') {
        this._setName('black', cfg.humanColor === B ? '你' : aiName);
        this._setName('white', cfg.humanColor === W ? '你' : aiName);
      } else {
        this._setName('black', '黑方');
        this._setName('white', '白方');
      }

      const komiNote = cfg.handicap > 0
        ? `让${cfg.handicap}子局 · 白先行 · 贴 ${this.engine.komi} 目`
        : `${cfg.size} 路 · 黑贴 ${this.engine.komi} 目 · 中国规则`;
      document.querySelector('#rule-note').textContent = komiNote;
      if (cfg.handicap > 0) global.App.toast(`让 ${cfg.handicap} 子局开始，白棋先行`, 'info');

      this._syncPanels();
      this._renderLog();
      this._setScoringUI(false);
      this.maybeAI();
    },

    _setName(color, name) {
      document.querySelector(`#player-${color === B ? 'black' : 'white'} .pname`).textContent = name;
    },

    humanTurn() {
      if (!this.engine || this.engine.over || this.scoring) return false;
      if (this.cfg.mode === 'pvp') return true;
      return this.engine.turn === this.cfg.humanColor && !this.aiThinking;
    },

    tap(idx) {
      if (this.scoring) {
        if (this.engine.board[idx] === 0) return;
        if (this.view.deadMarks.has(idx)) this.view.deadMarks.delete(idx);
        else this.view.deadMarks.add(idx);
        this.view.requestRender();
        this._liveScore();
        return;
      }
      if (!this.humanTurn()) return;
      const [x, y] = this.engine.xy(idx);
      const r = this.engine.play(x, y, this.engine.turn);
      if (!r.legal) {
        global.Sfx.error();
        const msg = {
          occupied: '此处已有棋子',
          suicide: '禁着点：落子后无气且不能提子',
          ko: '打劫：不可立即提回，请先寻劫材',
        }[r.reason] || '此处不可落子';
        global.App.toast(msg, 'error');
        return;
      }
      // play 之后 turn 已切换至对方，opponent() 即刚落子的一方
      this._afterMove(idx, this.engine.opponent(), r);
    },

    _afterMove(idx, movedColor, r) {
      const v = this.view;
      v.setBoard(this.engine.board, idx);
      v.animatePlace(idx, movedColor);
      global.Sfx.stone();
      if (r.captured && r.captured.length) {
        v.animateCapture(r.captured, movedColor === B ? W : B);
        global.Sfx.capture();
        global.App.toast(`${movedColor === B ? '黑' : '白'}方提子 ${r.captured.length} 枚`, 'info');
      }
      this._syncPanels();
      this._renderLog();
      this._syncNumberMap();
      if (this.engine.over) {
        global.App.toast('双方连续停一手，对局结束——请标记死子后结算', 'info');
        this.enterScoring(true);
        return;
      }
      this.maybeAI();
    },

    maybeAI() {
      if (this.cfg.mode !== 'ai' || !this.engine || this.engine.over) return;
      const aiColor = this.cfg.humanColor === B ? W : B;
      if (this.engine.turn !== aiColor) return;
      this.aiThinking = true;
      this._syncPanels();
      const delay = 420 + Math.random() * 480 + (this.cfg.level >= 2 ? 300 : 0);
      this._aiTimer = setTimeout(() => {
        const mv = global.GoAI.chooseMove(this.engine, aiColor, this.cfg.level);
        this.aiThinking = false;
        if (mv.pass) {
          this.engine.pass(aiColor);
          this._renderLog();
          global.App.toast(`${aiColor === B ? '黑' : '白'}方停一手`, 'info');
          if (this.engine.over) {
            global.App.toast('双方连续停一手，对局结束——请标记死子后结算', 'info');
            this.enterScoring(true);
          } else {
            this._syncPanels();
          }
          return;
        }
        const [x, y] = this.engine.xy(mv.idx);
        const r = this.engine.play(x, y, aiColor);
        if (!r.legal) { this.engine.pass(aiColor); this._syncPanels(); return; }
        this._afterMove(mv.idx, aiColor, r);
      }, delay);
    },

    humanPass() {
      if (this.scoring || !this.engine || this.engine.over || !this.humanTurn()) return;
      const color = this.engine.turn;
      this.engine.pass(color);
      global.App.toast(`${color === B ? '黑' : '白'}方停一手`, 'info');
      this._syncPanels();
      this._renderLog();
      if (this.engine.over) {
        global.App.toast('双方连续停一手，对局结束——请标记死子后结算', 'info');
        this.enterScoring(true);
        return;
      }
      this.maybeAI();
    },

    undo() {
      if (!this.engine || !this.engine.canUndo() || this.aiThinking) return;
      if (this.scoring) this.exitScoring();
      this.engine.undo();
      if (this.cfg.mode === 'ai') {
        // 连撤两手，直到又轮到自己
        while (this.engine.turn !== this.cfg.humanColor && this.engine.canUndo()) this.engine.undo();
        if (this.engine.turn !== this.cfg.humanColor) this.maybeAI();
      }
      this.view.setBoard(this.engine.board, this.engine.lastMove && !this.engine.lastMove.pass
        ? this.engine.idx(this.engine.lastMove.x, this.engine.lastMove.y) : -1);
      this.view.territory = [];
      this._syncPanels();
      this._renderLog();
      this._syncNumberMap();
    },

    async resign() {
      if (!this.engine || this.engine.over) return;
      const okGo = await global.App.confirm('确定中盘认负？');
      if (!okGo) return;
      const loser = this.cfg.mode === 'pvp' ? this.engine.turn : this.cfg.humanColor;
      this.engine.over = true;
      const winner = loser === B ? '白' : '黑';
      this._showResult({ resigned: true, winnerName: winner });
    },

    enterScoring(auto) {
      if (!this.engine) return;
      this.scoring = true;
      this.view.territory = [];
      this.view.deadMarks.clear();
      this._setScoringUI(true, auto);
      this._liveScore();
      this.view.requestRender();
    },

    exitScoring() {
      this.scoring = false;
      this.scored = null;
      this.view.territory = [];
      this.view.deadMarks.clear();
      this._setScoringUI(false);
      this.view.requestRender();
      if (!this.engine.over) this.maybeAI();
    },

    _liveScore() {
      const r = this.engine.score([...this.view.deadMarks]);
      document.querySelector('#score-live').textContent =
        `黑 ${r.black} ｜ 白 ${r.white}（含贴 ${this.engine.komi}）`;
      this._lastScore = r;
    },

    confirmScore() {
      const r = this._lastScore || this.engine.score([...this.view.deadMarks]);
      this.scored = r;
      this.view.territory = [...r.terrMap].map((owner, idx) => owner ? {
        x: idx % this.engine.size, y: (idx / this.engine.size) | 0, color: owner,
      } : null).filter(Boolean);
      this.view.requestRender();
      this._setScoringUI(false);
      this.scoring = false;
      this._showResult(r);
    },

    _setScoringUI(on, auto = false) {
      document.querySelector('#score-bar').classList.toggle('show', on);
      document.querySelector('#score-bar .score-hint').textContent = auto
        ? '对局已结束 · 点击棋子标记死子' : '点击棋子标记死子';
      document.querySelector('#btn-score-resume').style.display = this.engine && this.engine.over ? 'none' : '';
    },

    _showResult(r) {
      let title, sub, sealChar;
      if (r.resigned) {
        title = `${r.winnerName}中盘胜`;
        sealChar = '胜';
        sub = '对方中盘认负';
      } else {
        const winName = r.winner === B ? '黑' : r.winner === W ? '白' : '';
        title = r.winner === 0 ? '和棋' : `${winName}胜 ${fmt(r.margin)} 目`;
        sealChar = r.winner === 0 ? '和' : winName;
        sub = `黑 ${fmt(r.black)} ｜ 白 ${fmt(r.white)}（含贴 ${this.engine.komi}）`;
      }
      let yourLine = '';
      if (this.cfg.mode === 'ai') {
        const youWin = r.resigned
          ? (this.cfg.humanColor === B ? r.winnerName === '黑' : r.winnerName === '白')
          : r.winner === this.cfg.humanColor;
        yourLine = youWin ? '此局你获胜 — 落子生威。' : (r.winner === 0 ? '势均力敌。' : '此局惜败 — 复盘再战。');
      }
      const rows = r.resigned ? [] : [
        `黑 · 子数 ${r.stones[1]} ＋ 地域 ${r.terr[1]}`,
        `白 · 子数 ${r.stones[2]} ＋ 地域 ${r.terr[2]} ＋ 贴目 ${this.engine.komi}`,
      ];
      global.App.resultModal({
        title, sub, sealChar, rows, yourLine,
        onNew: () => global.App.show('screen-setup'),
      });
    },

    _syncPanels() {
      const e = this.engine;
      document.querySelector('#cap-b').textContent = e.capturesBy[B];
      document.querySelector('#cap-w').textContent = e.capturesBy[W];
      document.querySelector('#move-count').textContent = e.moveNumber;
      const turnB = e.turn === B && !e.over;
      const turnW = e.turn === W && !e.over;
      document.querySelector('#player-black').classList.toggle('active', turnB);
      document.querySelector('#player-white').classList.toggle('active', turnW);
      document.querySelector('#player-black .turn-tag').textContent = turnB ? '行棋' : '';
      document.querySelector('#player-white .turn-tag').textContent = turnW ? '行棋' : '';
      const think = document.querySelector('#ai-thinking');
      think.classList.toggle('show', this.aiThinking);
    },

    _syncNumberMap() {
      if (!this.view.showNumbers) return;
      const m = new Map();
      this.engine.moves.forEach((mv, i) => {
        if (!mv.pass) m.set(this.engine.idx(mv.x, mv.y), i + 1);
      });
      this.view.numberMap = m;
    },

    _renderLog() {
      const el = document.querySelector('#move-log');
      el.innerHTML = '';
      const frag = document.createDocumentFragment();
      this.engine.moves.forEach((mv, i) => {
        const item = document.createElement('span');
        item.className = 'log-item';
        const cs = mv.color === B ? '黑' : '白';
        const pos = mv.pass ? '停' : this.engine.coordName(mv.x, mv.y);
        item.textContent = `${i + 1} ${cs} ${pos}`;
        frag.appendChild(item);
      });
      el.appendChild(frag);
      el.scrollTop = el.scrollHeight;
    },
  };

  function fmt(n) { return Number.isInteger(n) ? String(n) : n.toFixed(1); }

  global.GameCtl = GameCtl;
})(typeof window !== 'undefined' ? window : globalThis);
