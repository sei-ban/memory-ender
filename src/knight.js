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
    if (H.a > 0) {
      g.fillStyle(C.horse, H.a);
      const hx = H.ox, hy = H.oy;
      g.fillRoundedRect(X(-36) + hx, Y(-64) + hy, 72 * s, 28 * s, 10 * s);
      g.fillRoundedRect(X(26) + hx, Y(-88) + hy, 18 * s, 30 * s, 5 * s);
      g.fillRect(X(-28 + leg) + hx, Y(-40) + hy, 7 * s, 40 * s).fillRect(X(-14 - leg) + hx, Y(-40) + hy, 7 * s, 40 * s);
      g.fillRect(X(14 + leg) + hx, Y(-40) + hy, 7 * s, 40 * s).fillRect(X(24 - leg) + hx, Y(-40) + hy, 7 * s, 40 * s);
    }
    if (body > 0) {
      // 갑옷 아래 맨몸 (회색 천) + 말에서 내려섰을 때의 다리
      g.fillStyle(0x8a8478, body).fillRoundedRect(X(-10), R(-100), 20 * s, 38 * s, 6 * s);
      if (drop > 0) g.fillRect(X(-8), R(-64), 6 * s, (24) * s).fillRect(X(2), R(-64), 6 * s, 24 * s);
      g.fillStyle(0xd8c8b0, body).fillCircle(X(0), R(-110), 8 * s);
    }
    // 창
    let q = P('lance');
    if (q.a > 0) g.lineStyle(3.5 * s, C.lance, q.a).lineBetween(X(8) + q.ox, R(-86) + q.oy, X(84) + q.ox, R(-128) + q.oy);
    // 방패
    q = P('shield');
    if (q.a > 0) {
      g.fillStyle(0xb0884a, q.a).fillRoundedRect(X(-30) + q.ox, R(-98) + q.oy, 17 * s, 26 * s, 5 * s);
      g.lineStyle(1.5 * s, 0xfff1c9, q.a).strokeRoundedRect(X(-30) + q.ox, R(-98) + q.oy, 17 * s, 26 * s, 5 * s);
    }
    // 흉갑
    q = P('chest');
    if (q.a > 0) {
      g.fillStyle(C.knight, q.a).fillRoundedRect(X(-11) + q.ox, R(-96) + q.oy, 22 * s, 28 * s, 5 * s);
      g.lineStyle(1.5 * s, 0xfff1c9, q.a * 0.8).lineBetween(X(0) + q.ox, R(-94) + q.oy, X(0) + q.ox, R(-71) + q.oy);
    }
    // 투구
    q = P('helm');
    if (q.a > 0) {
      g.fillStyle(C.knight, q.a).fillCircle(X(0) + q.ox, R(-112) + q.oy, 11 * s);
      g.fillStyle(0x3a2a18, q.a).fillRect(X(-7) + q.ox, R(-114) + q.oy, 14 * s, 2.5 * s);
    }
  };
})();
