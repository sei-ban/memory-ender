// 망자(기사) 공용 그리기 — 추격과 장례에서 같은 모습을 쓴다
// 좌표는 말 발밑 중앙 기준(로컬 단위). s = 배율
// o.parts[id] = { a: 투명도, ox, oy } : 장례에서 뜯겨 나가는 갑옷 파츠
(function () {
  // 갑옷 파츠 기준점(로컬 단위) — 장례의 붙잡기 판정에도 쓴다
  ME.KNIGHT_PARTS = {
    lance:  { x: 46,  y: -107, r: 24 },
    helm:   { x: 0,   y: -112, r: 15 },
    shield: { x: -21, y: -85,  r: 15 },
    horse:  { x: 0,   y: -50,  r: 34 },
    chest:  { x: 0,   y: -82,  r: 14 },
  };

  ME.drawKnight = function (g, X0, Y0, s, o = {}) {
    const C = ME.COLORS, leg = o.leg || 0, body = o.body == null ? 1 : o.body;
    const P = (id) => (o.parts && o.parts[id]) || { a: body, ox: 0, oy: 0 };
    const X = (v) => X0 + v * s, Y = (v) => Y0 + v * s;
    const H = P('horse');
    // 말이 사라지면 기사는 땅으로 내려선다 (o.drop: 0~1)
    const drop = (o.drop || 0) * 40;
    const R = (v) => Y0 + (v + drop) * s; // 기사 몸 y
    const t = (typeof performance !== 'undefined' ? performance.now() : 0) / 1000;
    if (H.a > 0) {
      const hx = H.ox, hy = H.oy, a = H.a;
      const px = (v) => X(v) + hx, py = (v) => Y(v) + hy;
      // 말 그림자 오라 (망자의 잔광)
      g.fillStyle(0xffd28a, 0.10 * a).fillEllipse(px(0), py(-50), 110 * s, 70 * s);
      // 다리 (뒤쪽 두 개는 어둡게)
      g.fillStyle(0x2a1410, a);
      g.fillRect(px(-26 + leg), py(-40), 6 * s, 40 * s).fillRect(px(18 + leg), py(-40), 6 * s, 40 * s);
      g.fillStyle(C.horse, a);
      g.fillRect(px(-14 - leg), py(-40), 7 * s, 40 * s).fillRect(px(26 - leg), py(-40), 7 * s, 40 * s);
      g.fillStyle(0xfff1c9, 0.8 * a).fillRect(px(-14 - leg), py(-4), 7 * s, 4 * s).fillRect(px(26 - leg), py(-4), 7 * s, 4 * s);
      // 몸통
      g.fillStyle(C.horse, a).fillRoundedRect(px(-36), py(-66), 74 * s, 30 * s, 12 * s);
      // 목과 머리
      g.fillPoints([{ x: px(22), y: py(-64) }, { x: px(36), y: py(-96) }, { x: px(48), y: py(-98) }, { x: px(40), y: py(-58) }], true);
      g.fillRoundedRect(px(38), py(-102), 22 * s, 12 * s, 4 * s);
      g.fillStyle(0x1a0c08, a).fillRect(px(50), py(-100), 3 * s, 3 * s);
      // 갈기와 꼬리 (금빛, 바람에 흔들림)
      const w = Math.sin(t * 9) * 3;
      g.fillStyle(0xffd28a, 0.85 * a);
      g.fillPoints([{ x: px(34), y: py(-98) }, { x: px(24 + w), y: py(-92) }, { x: px(18 + w), y: py(-70) }, { x: px(26), y: py(-66) }], true);
      g.fillPoints([{ x: px(-36), y: py(-62) }, { x: px(-52 + w), y: py(-58) }, { x: px(-60 + w), y: py(-38) }, { x: px(-38), y: py(-50) }], true);
      // 안장과 마갑 천
      g.fillStyle(0x6a1e2a, a).fillRect(px(-14), py(-68), 26 * s, 18 * s);
      g.fillStyle(0xe9c46a, a).fillRect(px(-14), py(-52), 26 * s, 2 * s);
      // 윗선 빛
      g.fillStyle(0xffb47a, 0.6 * a).fillRect(px(-30), py(-66), 52 * s, 2 * s);
    }
    if (body > 0) {
      g.fillStyle(0x8a8478, body).fillRoundedRect(X(-10), R(-100), 20 * s, 38 * s, 6 * s);
      if (drop > 0) g.fillRect(X(-8), R(-64), 6 * s, 24 * s).fillRect(X(2), R(-64), 6 * s, 24 * s);
      g.fillStyle(0xd8c8b0, body).fillCircle(X(0), R(-110), 8 * s);
    }
    // 창 (자루 + 촉 + 깃발)
    let q = P('lance');
    if (q.a > 0) {
      g.lineStyle(3.5 * s, 0x8a6a3a, q.a).lineBetween(X(8) + q.ox, R(-86) + q.oy, X(84) + q.ox, R(-128) + q.oy);
      g.fillStyle(C.lance, q.a).fillTriangle(X(84) + q.ox, R(-128) + q.oy, X(78) + q.ox, R(-120) + q.oy, X(96) + q.ox, R(-136) + q.oy);
      const fw = Math.sin(t * 11) * 3;
      g.fillStyle(0x9a2a3a, q.a).fillPoints([{ x: X(70) + q.ox, y: R(-121) + q.oy }, { x: X(56 + fw) + q.ox, y: R(-116) + q.oy }, { x: X(64) + q.ox, y: R(-112) + q.oy }], true);
    }
    // 방패
    q = P('shield');
    if (q.a > 0) {
      g.fillStyle(0x7a5a2a, q.a).fillRoundedRect(X(-31) + q.ox, R(-99) + q.oy, 19 * s, 28 * s, 6 * s);
      g.fillStyle(0xb0884a, q.a).fillRoundedRect(X(-29) + q.ox, R(-97) + q.oy, 15 * s, 24 * s, 5 * s);
      g.fillStyle(0xfff1c9, q.a).fillRect(X(-23) + q.ox, R(-94) + q.oy, 3 * s, 18 * s).fillRect(X(-28) + q.ox, R(-87) + q.oy, 13 * s, 3 * s);
    }
    // 흉갑
    q = P('chest');
    if (q.a > 0) {
      g.fillStyle(0xa8823a, q.a).fillRoundedRect(X(-12) + q.ox, R(-97) + q.oy, 24 * s, 30 * s, 5 * s);
      g.fillStyle(C.knight, q.a).fillRoundedRect(X(-10) + q.ox, R(-96) + q.oy, 18 * s, 26 * s, 4 * s);
      g.fillStyle(0xfff1c9, q.a * 0.9).fillRect(X(-8) + q.ox, R(-94) + q.oy, 3 * s, 20 * s);
      g.fillStyle(0x6a1e2a, q.a).fillRect(X(-12) + q.ox, R(-72) + q.oy, 24 * s, 4 * s);
    }
    // 투구 (깃털 장식)
    q = P('helm');
    if (q.a > 0) {
      const pw = Math.sin(t * 8) * 2;
      g.fillStyle(0x9a2a3a, q.a).fillPoints([{ x: X(-2) + q.ox, y: R(-122) + q.oy }, { x: X(-18 + pw) + q.ox, y: R(-132) + q.oy }, { x: X(-22 + pw) + q.ox, y: R(-120) + q.oy }, { x: X(-6) + q.ox, y: R(-116) + q.oy }], true);
      g.fillStyle(0xa8823a, q.a).fillCircle(X(0) + q.ox, R(-112) + q.oy, 12 * s);
      g.fillStyle(C.knight, q.a).fillCircle(X(1) + q.ox, R(-113) + q.oy, 10 * s);
      g.fillStyle(0x1a1008, q.a).fillRect(X(-6) + q.ox, R(-115) + q.oy, 16 * s, 3 * s);
      g.fillStyle(0xffd28a, q.a).fillRect(X(4) + q.ox, R(-115) + q.oy, 3 * s, 3 * s); // 눈빛
      g.fillStyle(0xfff1c9, q.a).fillRect(X(-5) + q.ox, R(-121) + q.oy, 4 * s, 3 * s);
    }
  };

  // 장의사 (추격과 장례 공용). 발밑 중앙 기준, a = 투명도
  ME.drawUndertaker = function (pg0, X0, Y0, o = {}) {
    const run = o.run || 0, A = o.a == null ? 1 : o.a;
    if (A <= 0) return;
    const pg = {
      fillStyle(c, a) { pg0.fillStyle(c, (a == null ? 1 : a) * A); return pg; },
      lineStyle(w, c, a) { pg0.lineStyle(w, c, (a == null ? 1 : a) * A); return pg; },
      fillCircle(x, y, r) { pg0.fillCircle(X0 + x, Y0 + y, r); return pg; },
      fillRect(x, y, w, h) { pg0.fillRect(X0 + x, Y0 + y, w, h); return pg; },
      fillPoints(pts, c) { pg0.fillPoints(pts.map(q => ({ x: X0 + q.x, y: Y0 + q.y })), c); return pg; },
    };
      // 조등 불빛 (발밑과 몸에 번지는 차가운 빛)
      pg.fillStyle(0x7fe6ff, 0.10).fillCircle(26, -36, 40);
      pg.fillStyle(0x7fe6ff, 0.12).fillCircle(26, -36, 22);
      // 다리
      pg.fillStyle(0x10141c, 1).fillRect(-8 + run * 5, -18, 6, 18).fillRect(2 - run * 5, -18, 6, 18);
      // 긴 상복 코트 (자락이 뒤로 날림)
      pg.fillStyle(0x161b26, 1).fillPoints([{ x: -11, y: -54 }, { x: 11, y: -54 }, { x: 13, y: -14 }, { x: -12 - 6 - run * 3, y: -12 }], true);
      pg.fillStyle(0x2a3446, 1).fillRect(-11, -54, 3, 40);            // 코트 왼쪽 반사선
      pg.fillStyle(0x7fe6ff, 0.55).fillRect(10, -52, 2, 36);           // 조등 쪽 테두리 빛
      // 목과 흰 깃
      pg.fillStyle(0xd8dde6, 1).fillRect(-5, -57, 10, 4);
      // 머리와 갓(챙 넓은 모자)
      pg.fillStyle(0xc9b9a4, 1).fillRect(-6, -68, 12, 11);
      pg.fillStyle(0x0c0f15, 1).fillRect(-14, -72, 28, 4).fillRect(-8, -82, 16, 10);
      pg.fillStyle(0x7fe6ff, 0.5).fillRect(6, -82, 2, 10);
      // 팔과 조등
      pg.fillStyle(0x161b26, 1).fillRect(6, -48, 14, 6);
      pg.fillStyle(0x2b3442, 1).fillRect(18, -46, 3, 6);
      pg.fillStyle(0x2b3442, 1).fillRect(20, -40, 12, 12);
      pg.fillStyle(0xbff6ff, 1).fillRect(22, -38, 8, 8);
      pg.fillStyle(0xffffff, 1).fillRect(24, -36, 4, 4);
  };
})();
