/* ============================================================
   弈 · 全局路由与界面管理
   ============================================================ */
(function (global) {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  // 全局错误留痕：便于排查（同时打印到控制台）
  window.addEventListener('error', (e) => {
    console.error(e.error || e.message);
    document.documentElement.setAttribute('data-last-error',
      `${e.message} @${(e.filename || '').split('/').pop()}:${e.lineno}`);
  });

  const App = {
    show(id) {
      $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
      // 切换到对局/教程时令画布重新量取尺寸
      requestAnimationFrame(() => {
        global.dispatchEvent(new Event('resize'));
      });
    },

    toast(msg, type = 'info') {
      const layer = $('#toast-root');
      const el = document.createElement('div');
      el.className = 'toast ' + type;
      el.textContent = msg;
      layer.appendChild(el);
      setTimeout(() => el.classList.add('bye'), 2200);
      setTimeout(() => el.remove(), 2600);
    },

    confirm(text, okText = '确定', cancelText = '再想想') {
      return new Promise((resolve) => {
        const layer = $('#modal-root');
        layer.innerHTML = `
          <div class="modal-mask">
            <div class="modal">
              <div class="modal-title">${text}</div>
              <div class="modal-actions">
                <button class="btn" data-act="no">${cancelText}</button>
                <button class="btn btn-primary" data-act="yes">${okText}</button>
              </div>
            </div>
          </div>`;
        const done = (v) => { layer.innerHTML = ''; resolve(v); };
        layer.querySelector('[data-act="yes"]').addEventListener('click', () => done(true));
        layer.querySelector('[data-act="no"]').addEventListener('click', () => done(false));
      });
    },

    resultModal({ title, sub, sealChar, rows = [], yourLine = '', onNew }) {
      const layer = $('#modal-root');
      layer.innerHTML = `
        <div class="modal-mask">
          <div class="modal result-modal">
            <div class="seal-big">${sealChar || '局'}</div>
            <div class="result-title">${title}</div>
            ${sub ? `<div class="result-sub">${sub}</div>` : ''}
            ${rows.length ? `<div class="result-rows">${rows.map(r => `<div>${r}</div>`).join('')}</div>` : ''}
            ${yourLine ? `<div class="result-you">${yourLine}</div>` : ''}
            <div class="modal-actions">
              <button class="btn" data-act="view">再看棋盘</button>
              <button class="btn" data-act="home">回首页</button>
              <button class="btn btn-primary" data-act="new">新对局</button>
            </div>
          </div>
        </div>`;
      layer.querySelector('[data-act="view"]').addEventListener('click', () => { layer.innerHTML = ''; });
      layer.querySelector('[data-act="home"]').addEventListener('click', () => { layer.innerHTML = ''; App.show('screen-home'); });
      layer.querySelector('[data-act="new"]').addEventListener('click', () => { layer.innerHTML = ''; if (onNew) onNew(); });
    },
  };

  /* ---------- 启动 ---------- */

  function initHome() {
    $('#btn-go-play').addEventListener('click', () => App.show('screen-setup'));
    $('#btn-go-learn').addEventListener('click', () => {
      global.Tutorial.renderList($('#lesson-list'));
      App.show('screen-learn');
    });
    $('#btn-go-kifu').addEventListener('click', () => {
      global.KifuCtl.renderList();
      App.show('screen-kifu-list');
    });
    $$('.back-home').forEach(b => b.addEventListener('click', () => App.show('screen-home')));
    $('#btn-learn-back').addEventListener('click', () => App.show('screen-home'));
  }

  function setupForm() {
    const komiOf = (size) => (size >= 19 ? 7.5 : size >= 13 ? 6.5 : 5.5);
    const maxHandicap = (size) => (size >= 19 ? 9 : 5);

    function refresh() {
      const mode = document.querySelector('input[name=mode]:checked').value;
      const size = +document.querySelector('input[name=size]:checked').value;
      $('#level-group').style.display = mode === 'ai' ? '' : 'none';
      $('#color-group').style.display = mode === 'ai' ? '' : 'none';
      const sel = $('#handicap-sel');
      const cur = +sel.value || 0;
      sel.innerHTML = '<option value="0">无让子 · 分先</option>' +
        Array.from({ length: maxHandicap(size) - 1 }, (_, i) => i + 2)
          .map(n => `<option value="${n}" ${n === cur ? 'selected' : ''}>让 ${n} 子</option>`).join('');
      const hc = +sel.value || 0;
      $('#setup-komi').textContent = hc > 0
        ? `让子局 · 白先行 · 贴 ${0.5} 目`
        : `${size} 路 · 黑贴 ${komiOf(size)} 目 · 中国规则`;
    }

    $$('input[name=mode], input[name=size]').forEach(r => r.addEventListener('change', refresh));
    $('#handicap-sel').addEventListener('change', refresh);
    refresh();

    $('#btn-start').addEventListener('click', () => {
      const mode = document.querySelector('input[name=mode]:checked').value;
      const size = +document.querySelector('input[name=size]:checked').value;
      const level = +document.querySelector('input[name=level]:checked').value;
      const humanColor = document.querySelector('input[name=color]:checked').value === 'white' ? 2 : 1;
      const handicap = +$('#handicap-sel').value || 0;
      App.show('screen-game');
      requestAnimationFrame(() => {
        global.GameCtl.start({ mode, size, level, humanColor, handicap });
      });
    });
  }

  function initBoards() {
    // 对局棋盘
    const wrap = $('#game-board-wrap');
    const cv = $('#game-board');
    const gv = new global.BoardView(cv);
    global.GameCtl.init(gv);
    const ro = () => {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (w && h) gv.resize(Math.floor(Math.min(w, h)));
    };
    new ResizeObserver(ro).observe(wrap);

    // 教程棋盘
    const lwrap = $('#lesson-board-wrap');
    const lcv = $('#lesson-board');
    const lv = new global.BoardView(lcv);
    global.Tutorial.init(lv);
    const lro = () => {
      const w = lwrap.clientWidth, h = lwrap.clientHeight;
      if (w && h) lv.resize(Math.floor(Math.min(w, h)));
    };
    new ResizeObserver(lro).observe(lwrap);

    // 名局打谱棋盘
    const kwrap = $('#kifu-board-wrap');
    const kcv = $('#kifu-board');
    const kv = new global.BoardView(kcv);
    global.KifuCtl.init(kv);
    const kro = () => {
      const w = kwrap.clientWidth, h = kwrap.clientHeight;
      if (w && h) kv.resize(Math.floor(Math.min(w, h)));
    };
    new ResizeObserver(kro).observe(kwrap);

    // 默认棋盘展示（首页背景无棋盘，教程列表页给个空盘做装饰）
    lv.setSize(9);
    lv.setBoard(new Int8Array(81));
  }

  function initPrefs() {
    const sound = $('#tg-sound');
    sound.checked = global.Sfx.isOn();
    global.Sfx.setOn(sound.checked);
  }

  function boot() {
    initHome();
    setupForm();
    initBoards();
    initPrefs();
    App.show('screen-home');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  global.App = App;
})(typeof window !== 'undefined' ? window : globalThis);
