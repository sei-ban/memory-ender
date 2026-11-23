// 화면 질감: 월드는 도트로 깎고(픽셀화), 글자는 선명하게 남긴다
// 메인 카메라 = 그림(픽셀화 + 비네트), UI 카메라 = 글자만
(function () {
  ME.LOOK = { pixel: 2, vignette: 0.32 };

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
