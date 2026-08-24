/* ============================================================
   弈 · 音效（WebAudio 合成，无外部资源）
   ============================================================ */
(function (global) {
  'use strict';

  let ctx = null;
  let enabled = true;
  try { enabled = localStorage.getItem('yi.sound') !== 'off'; } catch (e) { /* 隐私模式 */ }

  function ac() {
    if (!ctx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function noiseBuffer(c, dur) {
    const len = Math.max(1, (c.sampleRate * dur) | 0);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // 落子：短促「嗒」声（木质回响 + 高频敲击）
  function stone() {
    if (!enabled) return;
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    const detune = 0.9 + Math.random() * 0.2;

    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(330 * detune, t);
    osc.frequency.exponentialRampToValueAtTime(130, t + 0.07);
    const og = c.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.5, t + 0.004);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(og).connect(c.destination);
    osc.start(t); osc.stop(t + 0.14);

    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 0.03);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 2600 * detune; bp.Q.value = 1.2;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.22, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    src.connect(bp).connect(ng).connect(c.destination);
    src.start(t);
  }

  // 提子：轻柔的拂拭声
  function capture() {
    if (!enabled) return;
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 0.16);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1400, t);
    lp.frequency.exponentialRampToValueAtTime(320, t + 0.16);
    const g = c.createGain();
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
    src.connect(lp).connect(g).connect(c.destination);
    src.start(t);
  }

  // 正解：两声清越的磬音
  function success() {
    if (!enabled) return;
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    [[660, 0], [990, 0.11]].forEach(([f, dt]) => {
      const o = c.createOscillator();
      o.type = 'sine'; o.frequency.value = f;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(0.18, t + dt + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.5);
      o.connect(g).connect(c.destination);
      o.start(t + dt); o.stop(t + dt + 0.55);
    });
  }

  // 失误：低沉一嗡
  function error() {
    if (!enabled) return;
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = 'triangle'; o.frequency.value = 150;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 600;
    o.connect(lp).connect(g).connect(c.destination);
    o.start(t); o.stop(t + 0.18);
  }

  function isOn() { return enabled; }
  function setOn(v) {
    enabled = !!v;
    try { localStorage.setItem('yi.sound', enabled ? 'on' : 'off'); } catch (e) { /* 忽略 */ }
  }

  global.Sfx = { stone, capture, success, error, isOn, setOn };
})(typeof window !== 'undefined' ? window : globalThis);
