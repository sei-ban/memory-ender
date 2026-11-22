// 메모리 엔더 — 도트(칩튠) 효과음
// 외부 음원 없이 Web Audio로 직접 합성한다 (타인 저작물 사용 금지 규칙). M = 소리 켜기/끄기
(function () {
  let ctx = null, master = null, muted = false;
  let hum = null, bgm = null;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.32; master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // 사각파·삼각파 한 음 (주파수가 f0 → f1로 미끄러짐)
  function tone(type, f0, f1, dur, vol, delay) {
    const c = ac(); if (!c || muted) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  // 잡음 (8비트 타격·폭발)
  let noiseBuf = null;
  function ensureNoise(c) {
    if (noiseBuf) return;
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function noise(dur, vol, freq, delay) {
    const c = ac(); if (!c || muted) return;
    ensureNoise(c);
    const t = c.currentTime + (delay || 0);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = freq || 3000;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
  }
  const arp = (type, notes, step, vol, dur) => notes.forEach((n, i) => tone(type, n, n, dur || step * 1.6, vol, i * step));

  const N = { A3: 220, C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494, C5: 523, D5: 587, E5: 659, G5: 784, A5: 880, C6: 1047, E6: 1319 };

  // 효과음 (11/23 2차 피드백: 전부 가볍다 → 저음 몸통 + 걸러낸 잡음 + 잔향. 크기는 낮게)
  const S = {
    ui: () => { tone('sine', 520, 420, 0.12, 0.08); noise(0.04, 0.03, 2500); },
    // 추리
    ping: (s) => { tone('sine', 240 + s * 120, 200 + s * 100, 0.3, 0.05 + s * 0.05); soft('sine', 700 + s * 300, 0.9, 0.012 + s * 0.02, 0, 0.005, 1); },
    clue: () => { sweep(400, 2400, 0.5, 0.08); soft('sine', 220, 2.4, 0.07, 0.05, 0.03, 0.9); soft('sine', 329.6, 2.4, 0.05, 0.12, 0.03, 0.9); soft('triangle', 659.3, 1.8, 0.025, 0.25, 0.01, 1); thud(80, 0.4, 0.12); },
    wrong: () => { thud(70, 0.35, 0.14); thud(60, 0.4, 0.12, 0.18); },
    correct: () => { soft('sine', 220, 3, 0.07, 0, 0.05, 0.9); soft('sine', 277.2, 3, 0.05, 0.08, 0.05, 0.9); soft('sine', 329.6, 3, 0.05, 0.16, 0.05, 0.9); thud(70, 0.5, 0.12); },
    warp: () => { sweep(200, 4000, 1.0, 0.1); tone('sine', 80, 320, 1.0, 0.12); },
    // 추격
    zap: () => sweep(300, 1200, 0.15, 0.03),
    catch: () => { thud(130, 0.3, 0.22); noise(0.08, 0.08, 4500); soft('sine', 880, 0.8, 0.03, 0, 0.005, 0.7); },
    miss: () => { tone('sine', 160, 90, 0.25, 0.12); noise(0.15, 0.05, 600); },
    mash: (n) => { tone('sine', 110 + n * 12, 70 + n * 8, 0.12, 0.16); noise(0.035, 0.06, 3000); },
    charge: () => { sweep(300, 3000, 0.35, 0.07); tone('sine', 110, 330, 0.4, 0.12); soft('sine', 659.3, 1.2, 0.03, 0.3, 0.01, 0.8); },
    fire: () => { tone('sine', 260, 55, 0.4, 0.22); sweep(3000, 300, 0.35, 0.09); noise(0.12, 0.08, 1800); },
    hit: () => { thud(60, 0.9, 0.32); noise(0.5, 0.14, 1600); soft('sine', 110, 2.2, 0.05, 0, 0.01, 1); },
    jump: () => sweep(300, 900, 0.15, 0.035),
    hurt: () => { thud(75, 0.4, 0.2); noise(0.2, 0.08, 900); },
    finale: () => { thud(50, 1.4, 0.3); soft('sine', 110, 3.5, 0.06, 0, 0.3, 1); soft('sine', 164.8, 3.5, 0.04, 0.1, 0.3, 1); },
    // 장례
    grab: () => { tone('sine', 120, 90, 0.2, 0.1); noise(0.08, 0.03, 900); },
    rip: () => { thud(75, 0.5, 0.18); sweep(1800, 300, 0.35, 0.06); soft('sine', 220, 1.8, 0.03, 0.05, 0.02, 1); },
    ripBig: () => { thud(58, 0.9, 0.22); sweep(1400, 200, 0.6, 0.07); soft('sine', 164.8, 2.5, 0.035, 0.1, 0.05, 1); },
    memory: () => { soft('sine', 261.6, 3.2, 0.045, 0, 0.5, 1); soft('sine', 329.6, 3.2, 0.03, 0.15, 0.6, 1); soft('sine', 392, 3.0, 0.02, 0.3, 0.7, 1); },
    // 소멸: 알림처럼 올라가는 음계 대신, 따뜻한 화음이 한 번 차올랐다가 숨을 내쉬듯 사라진다 + 바람처럼 옅어지는 잡음
    dissolve: () => {
      pad([174.6, 220, 261.6, 329.6], 1.6, 1.2, 5.0, 0.05, 1600);
      pad([87.3], 1.2, 1.5, 5.5, 0.06, 500);
      breath(6.5, 0.035);
    },
    line: () => soft('sine', 392, 2.2, 0.018, 0, 0.15, 1),
    end: () => pad([261.6, 329.6, 392], 1.0, 0.8, 3.5, 0.035, 1400),
  };
  // 걸러낸 잡음이 주파수를 따라 미끄러짐 (쉭 하는 소리)
  function sweep(f0, f1, dur, vol, delay) {
    const c = ac(); if (!c || muted) return;
    ensureNoise(c);
    const t = c.currentTime + (delay || 0);
    const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    src.buffer = noiseBuf; bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    src.connect(bp); bp.connect(g); g.connect(master); src.start(t); src.stop(t + dur + 0.05);
  }
  // 화음 패드 (천천히 차오르고, 머물고, 길게 사라짐)
  function pad(freqs, attack, hold, release, vol, cutoff, delay) {
    const c = ac(); if (!c || muted) return;
    const t = c.currentTime + (delay || 0);
    const g = c.createGain(), lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = cutoff || 1500;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + attack + hold); g.gain.exponentialRampToValueAtTime(0.0005, t + attack + hold + release);
    lp.connect(g); g.connect(master);
    const r = reverb(); if (r) { const sg = c.createGain(); sg.gain.value = 0.9; g.connect(sg); sg.connect(r); }
    freqs.forEach((f, i) => [-5, 5].forEach(dt => {
      const o = c.createOscillator(); o.type = i === 0 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = dt;
      o.connect(lp); o.start(t); o.stop(t + attack + hold + release + 0.1);
    }));
  }
  // 숨결 같은 잡음 (밝게 시작해 점점 어둡고 작아짐)
  function breath(dur, vol) {
    const c = ac(); if (!c || muted) return;
    ensureNoise(c);
    const t = c.currentTime, src = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain();
    src.buffer = noiseBuf; src.loop = true; lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3000, t); lp.frequency.exponentialRampToValueAtTime(200, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.8); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    src.connect(lp); lp.connect(g); g.connect(master);
    const r = reverb(); if (r) { const sg = c.createGain(); sg.gain.value = 0.6; g.connect(sg); sg.connect(r); }
    src.start(t); src.stop(t + dur + 0.1);
  }

  // 잔향(리버브) 버스 — 장례처럼 무게가 필요한 소리에 쓴다
  let verb = null;
  function reverb() {
    const c = ac(); if (!c) return null;
    if (!verb) {
      const len = c.sampleRate * 2.8, ir = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      const cv = c.createConvolver(); cv.buffer = ir;
      const g = c.createGain(); g.gain.value = 0.55; cv.connect(g); g.connect(master);
      verb = cv;
    }
    return verb;
  }
  // 부드러운 음 (사인·삼각파, 천천히 들어오고 길게 사라짐, 잔향 포함)
  function soft(type, f, dur, vol, delay, attack, wet) {
    const c = ac(); if (!c || muted) return;
    const t = c.currentTime + (delay || 0), a = attack || 0.02;
    const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
    o.type = type; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 2200;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    o.connect(lp); lp.connect(g); g.connect(master);
    if (wet !== 0) { const r = reverb(); if (r) { const sg = c.createGain(); sg.gain.value = wet || 0.8; g.connect(sg); sg.connect(r); } }
    o.start(t); o.stop(t + dur + 0.05);
  }
  // 낮고 무거운 타격 (사인 저음 + 걸러낸 잡음)
  function thud(f, dur, vol, delay) {
    tone('sine', f, f * 0.45, dur, vol, delay);
    noise(dur * 0.8, vol * 0.6, 700, delay);
  }
  ME._soft = soft; ME._thud = thud;

  // 데이터 망자를 누르는 동안 (11/23 2차: 무섭다 → 낮은 단조 대신 따뜻한 장조 화음, 천천히 밝아짐, 부드러운 떨림)
  function humOn(level) {
    const c = ac(); if (!c) return;
    if (!hum) {
      const g = c.createGain(), lp = c.createBiquadFilter(), trem = c.createGain(), lfo = c.createOscillator(), lfoG = c.createGain();
      lp.type = 'lowpass'; lp.frequency.value = 900; g.gain.value = 0; trem.gain.value = 1;
      lfo.frequency.value = 3.2; lfoG.gain.value = 0.18; lfo.connect(lfoG); lfoG.connect(trem.gain); lfo.start();
      const freqs = [261.6, 329.6, 392, 493.9], oscs = freqs.map((f, i) => {
        const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.detune.value = (i % 2 ? 4 : -4);
        o.connect(lp); o.start(); return o;
      });
      lp.connect(trem); trem.connect(g); g.connect(master);
      const r = reverb(); if (r) { const sg = c.createGain(); sg.gain.value = 0.9; g.connect(sg); sg.connect(r); }
      hum = { oscs, g, lp };
    }
    const t = c.currentTime, lv = Math.max(0, Math.min(1, level || 0));
    hum.lp.frequency.setTargetAtTime(700 + lv * 2400, t, 0.4);
    hum.g.gain.setTargetAtTime(muted ? 0 : 0.035 + lv * 0.03, t, 0.5);
  }
  // 추격 마지막 붙잡기: 가볍게 긴장이 올라가는 소리 (장례 소리와 분리)
  let pull = null;
  function pullOn(level) {
    const c = ac(); if (!c) return;
    if (!pull) {
      ensureNoise(c);
      const src = c.createBufferSource(), bp = c.createBiquadFilter(), o = c.createOscillator(), g = c.createGain(), og = c.createGain();
      src.buffer = noiseBuf; src.loop = true; bp.type = 'bandpass'; bp.Q.value = 2; bp.frequency.value = 500;
      o.type = 'sine'; o.frequency.value = 140; og.gain.value = 0.5;
      src.connect(bp); bp.connect(g); o.connect(og); og.connect(g); g.gain.value = 0; g.connect(master); src.start(); o.start();
      pull = { bp, o, g };
    }
    const t = c.currentTime, lv = Math.max(0, Math.min(1, level || 0));
    pull.bp.frequency.setTargetAtTime(500 + lv * 2500, t, 0.1);
    pull.o.frequency.setTargetAtTime(140 + lv * 200, t, 0.1);
    pull.g.gain.setTargetAtTime(muted ? 0 : 0.025 + lv * 0.02, t, 0.08);
  }
  function pullOff() { if (pull && ctx) pull.g.gain.setTargetAtTime(0, ctx.currentTime, 0.1); }
  function humOff() { if (hum && ctx) hum.g.gain.setTargetAtTime(0, ctx.currentTime, 0.4); }

  // 배경음악 — 장면마다 다른 패턴. 한 칸 = 8분음표
  const BGM = {
    // 추리: 어둡고 조용한 방. 느린 저음 + 띄엄띄엄 오르골
    investigate: { bpm: 72, len: 32, play(i, t, note) {
      const bass = [110, 110, 87.3, 87.3, 98, 98, 82.4, 82.4];
      if (i % 4 === 0) note('triangle', bass[(i / 4) % 8], t, 1.6, 0.06, 0.08);
      const mel = { 2: 659, 7: 523, 11: 587, 14: 494, 18: 659, 23: 523, 27: 440, 30: 494 };
      if (mel[i % 32]) note('sine', mel[i % 32], t, 1.8, 0.035, 0.005, 0.9);
    } },
    // 추격: 긴박한 단조 루프
    chase: { bpm: 150, len: 16, play(i, t, note) {
      const bass = [110, 110, 220, 110, 87.3, 87.3, 174.6, 87.3, 98, 98, 196, 98, 82.4, 82.4, 164.8, 82.4];
      const lead = [440, 523, 659, 523, 440, 523, 349, 440, 494, 587, 784, 587, 494, 659, 392, 494];
      note('square', bass[i % 16], t, 0.18, 0.07, 0.003, 0);
      if (i % 2 === 0) note('triangle', lead[(i / 2) % 16], t, 0.36, 0.05, 0.003, 0);
      if (i % 4 === 2) noise(0.03, 0.03, 8000, Math.max(0, t - ctx.currentTime));
    } },
    // 장례: 느리고 따뜻한 화음 (Am - F - C - G), 아르페지오
    funeral: { bpm: 60, len: 32, play(i, t, note) {
      const chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [130.8, 196, 261.6], [196, 246.9, 293.7]];
      const ch = chords[Math.floor((i % 32) / 8)];
      if (i % 8 === 0) { note('sine', ch[0] / 2, t, 4.2, 0.07, 0.4, 0.6); note('triangle', ch[0], t, 4.0, 0.025, 0.6, 0.8); }
      if (i % 2 === 0) note('sine', ch[(i / 2) % 3] * 2, t, 1.6, 0.03, 0.01, 0.9);
    } },
  };
  function bgmStart(name) {
    const c = ac(); if (!c) return;
    if (bgm && bgm.name === name) return;
    bgmStop();
    const P = BGM[name]; if (!P) return;
    const step = 60 / P.bpm / 2; let i = 0, next = c.currentTime + 0.1;
    const g = c.createGain(); g.gain.value = 0; g.connect(master);
    g.gain.setTargetAtTime(1, c.currentTime, 0.8);
    const note = (type, f, t, d, v, a, wet) => {
      const o = c.createOscillator(), e = c.createGain();
      o.type = type; o.frequency.value = f; a = a || 0.005;
      e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(v, t + a); e.gain.exponentialRampToValueAtTime(0.0006, t + d);
      o.connect(e); e.connect(g);
      if (wet) { const r = reverb(); if (r) { const sg = c.createGain(); sg.gain.value = wet; e.connect(sg); sg.connect(r); } }
      o.start(t); o.stop(t + d + 0.05);
    };
    const timer = setInterval(() => {
      while (next < c.currentTime + 0.25) { if (!muted) P.play(i, next, note); next += step; i++; }
    }, 50);
    bgm = { timer, g, name };
  }
  function bgmStop(fade) {
    if (!bgm) return;
    clearInterval(bgm.timer);
    if (ctx) bgm.g.gain.setTargetAtTime(0, ctx.currentTime, fade || 0.3);
    bgm = null;
  }

  ME.sfx = {
    unlock: () => ac(),
    play: (name, arg) => { try { S[name] && S[name](arg); } catch (e) { /* 소리는 실패해도 게임은 계속 */ } },
    humOn, humOff, pullOn, pullOff, bgmStart, bgmStop, bgmName: () => bgm && bgm.name,
    toggleMute: () => { muted = !muted; if (muted) humOff(); return muted; },
    isMuted: () => muted,
  };
  window.addEventListener('keydown', (e) => { if (e.key === 'm' || e.key === 'M') ME.sfx.toggleMute(); });
})();
