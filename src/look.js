// 화면 질감: 월드는 도트로 깎고(픽셀화), 글자는 선명하게 남긴다
// 메인 카메라 = 그림(픽셀화 + 비네트), UI 카메라 = 글자만
(function () {
  ME.LOOK = { pixel: 0, vignette: 0.32 };

  ME.applyLook = function (scene, opt = {}) {
    const L = Object.assign({}, ME.LOOK, opt);
    const main = scene.cameras.main;
    const ui = scene.cameras.add(0, 0, ME.W, ME.H);
    const isUi = (o) => o.type === 'Text' || o.__ui;
    const route = (o) => { if (isUi(o)) main.ignore(o); else ui.ignore(o); };
    scene.children.list.forEach(route);
    scene.sys.events.on('addedtoscene', route);
    scene.events.once('shutdown', () => scene.sys.events.off('addedtoscene', route));
    if (main.postFX) {
      if (L.pixel > 0) main.postFX.addPixelate(L.pixel);
      if (L.vignette > 0) main.postFX.addVignette(0.5, 0.5, 0.95, L.vignette);
    }
    // 페이드·플래시는 글자 카메라도 같이
    ['fadeIn', 'fadeOut', 'flash'].forEach((fn) => {
      const orig = main[fn].bind(main);
      main[fn] = (...a) => { ui[fn](...a); return orig(...a); };
    });
    scene.uiCam = ui;
    return ui;
  };

  // 도트용 결정적 난수
  ME.hash = function (n) { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };

  // 캔버스에 그라데이션을 계단(밴드)으로 그린다: 도트 하늘 느낌
  ME.bandSky = function (c, x, y, w, h, stops, bands) {
    const lerp = (a, b, t) => a + (b - a) * t;
    const hex = (s) => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
    const at = (t) => {
      for (let i = 0; i < stops.length - 1; i++) {
        const [t0, c0] = stops[i], [t1, c1] = stops[i + 1];
        if (t <= t1) { const k = (t - t0) / (t1 - t0), A = hex(c0), B = hex(c1); return A.map((v, j) => Math.round(lerp(v, B[j], k))); }
      }
      return hex(stops[stops.length - 1][1]);
    };
    const bh = h / bands;
    for (let i = 0; i < bands; i++) {
      const [r, g, b] = at(i / (bands - 1));
      c.fillStyle = `rgb(${r},${g},${b})`; c.fillRect(x, Math.floor(y + i * bh), w, Math.ceil(bh) + 1);
      // 밴드 경계에 체크무늬 디더
      if (i > 0) {
        const [r2, g2, b2] = at((i - 1) / (bands - 1));
        c.fillStyle = `rgb(${r2},${g2},${b2})`;
        const yy = Math.floor(y + i * bh);
        for (let xx = x; xx < x + w; xx += 4) { c.fillRect(xx + ((yy / 2) % 2 ? 2 : 0), yy, 2, 2); }
      }
    }
  };

  // 능선 실루엣 (캔버스)
  ME.ridge = function (c, w, baseY, amp, freq, seed, color, jag) {
    c.fillStyle = color; c.beginPath(); c.moveTo(0, baseY + 400);
    for (let x = 0; x <= w; x += 4) {
      const y = baseY - amp * (0.5 + 0.3 * Math.sin((x + seed) * freq) + 0.2 * Math.sin((x + seed * 3) * freq * 2.7))
        - (jag ? (ME.hash(Math.floor(x / 8) + seed) * jag) : 0);
      c.lineTo(x, Math.round(y / 2) * 2);
    }
    c.lineTo(w, baseY + 400); c.closePath(); c.fill();
  };
})();

// ---------- 조작 안내 (화면 아래 안내판 + 목표 위치 표시) ----------
// icon: 'keys'(WASD) | 'space' | 'click' | 'hold' | 'mash' | 'drag' | 'aim'
(function () {
  const font = { fontFamily: '"Malgun Gothic","Apple SD Gothic Neo",sans-serif' };
  class Coach {
    constructor(scene, y) {
      this.s = scene; this.y = y || ME.H - 64; this.t = 0; this.step = null;
      this.g = scene.add.graphics().setDepth(40);
      this.txt = scene.add.text(0, this.y, '', { ...font, fontSize: '15px', fontStyle: 'bold', color: '#fff6e4' }).setOrigin(0, 0.5).setDepth(41);
      this.keyTxt = [];
    }
    set(step) {
      const key = step ? step.icon + step.text : '';
      if (key === this.key) { if (step) this.step.target = step.target; return; }
      this.key = key; this.step = step; this.t = 0;
      this.keyTxt.forEach(t => t.destroy()); this.keyTxt = [];
      this.txt.setText(step ? step.text : '');
    }
    update(dt) {
      this.t += dt;
      const g = this.g; g.clear();
      const st = this.step; if (!st) return;
      const iconW = st.icon === 'keys' ? 92 : st.icon === 'space' ? 84 : st.icon === 'drag' ? 58 : 34;
      const tw = this.txt.width, w = iconW + 14 + tw + 32, x0 = Math.round(ME.W / 2 - w / 2), y = this.y;
      const a = Math.min(1, this.t * 4);
      g.fillStyle(0x0c0a10, 0.78 * a).fillRoundedRect(x0, y - 22, w, 44, 8);
      g.lineStyle(2, 0xffd28a, 0.75 * a).strokeRoundedRect(x0, y - 22, w, 44, 8);
      this.txt.setPosition(x0 + 16 + iconW + 14, y).setAlpha(a);
      const ix = x0 + 16, blink = Math.sin(this.t * 8) > 0;
      const cap = (cx, cy, cw, label, on) => {
        g.fillStyle(on ? 0xffd28a : 0xa89cae, a).fillRoundedRect(cx, cy, cw, 18, 3);
        g.fillStyle(0x000000, 0.4 * a).fillRect(cx, cy + 15, cw, 3);
        if (this.keyTxt.length < 6 && label && !this.keyTxt.find(t => t.__l === label + cx)) {
          const t = this.s.add.text(0, 0, label, { ...font, fontSize: '11px', fontStyle: 'bold', color: '#1a1420' }).setOrigin(0.5).setDepth(42);
          t.__l = label + cx; t.__x = cx + cw / 2; t.__y = cy + 8; this.keyTxt.push(t);
        }
      };
      if (st.icon === 'keys') {
        const ph = Math.floor(this.t * 2.5) % 4;
        cap(ix + 32, y - 20, 24, 'W', ph === 0); cap(ix + 4, y + 1, 24, 'A', ph === 1);
        cap(ix + 32, y + 1, 24, 'S', ph === 2); cap(ix + 60, y + 1, 24, 'D', ph === 3);
      } else if (st.icon === 'space') {
        cap(ix, y - 9, 84, 'SPACE', blink);
      } else {
        // 마우스: 몸통 + 왼쪽 버튼
        const mx = ix + 6, my = y - 16;
        g.fillStyle(0xe8e0d0, a).fillRoundedRect(mx, my, 22, 32, 10);
        let on = false;
        if (st.icon === 'click') on = blink;
        else if (st.icon === 'mash') on = Math.sin(this.t * 30) > 0;
        else if (st.icon === 'hold' || st.icon === 'drag') on = true;
        g.fillStyle(on ? 0xff6a4a : 0xbfb6a6, a).fillRoundedRect(mx + 1, my + 1, 10, 13, { tl: 9, tr: 0, bl: 0, br: 0 });
        g.fillStyle(0x6a6070, a).fillRect(mx + 11, my + 2, 1, 12).fillRect(mx + 1, my + 14, 20, 1);
        if (st.icon === 'hold') { // 누르는 시간 막대
          const k = (this.t % 1.6) / 1.2;
          g.fillStyle(0x3a3040, a).fillRect(mx - 2, my + 35, 26, 4);
          g.fillStyle(0xffd28a, a).fillRect(mx - 2, my + 35, 26 * Math.min(1, k), 4);
        }
        if (st.icon === 'drag') { const dx = (this.t * 20) % 14; g.fillStyle(0xffd28a, a).fillTriangle(mx + 30 + dx, my + 10, mx + 30 + dx, my + 22, mx + 38 + dx, my + 16); }
        if (st.icon === 'aim') { g.lineStyle(2, 0xffd28a, a).strokeCircle(mx + 11, my + 16, 15 + Math.sin(this.t * 4) * 2); }
      }
      this.keyTxt.forEach(t => t.setPosition(t.__x, t.__y).setAlpha(a));
      // 목표 위치 표시: 링 + 위에서 가리키는 삼각형
      const tg = st.target;
      if (tg) {
        const r = (tg.r || 26) + Math.sin(this.t * 5) * 4, by = Math.sin(this.t * 6) * 5;
        g.lineStyle(3, 0xffd28a, 0.9).strokeCircle(tg.x, tg.y, r);
        g.lineStyle(1.5, 0xffffff, 0.6).strokeCircle(tg.x, tg.y, r + 6);
        g.fillStyle(0xffd28a, 1).fillTriangle(tg.x - 9, tg.y - r - 22 + by, tg.x + 9, tg.y - r - 22 + by, tg.x, tg.y - r - 10 + by);
      }
    }
  }
  ME.Coach = Coach;
})();
