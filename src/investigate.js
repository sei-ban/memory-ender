// 메모리 엔더 — 추리 구간 (현실, 탑뷰)
// 조등 전파로 흔적 탐색(가까울수록 신호 강함) → 단서 3개 → 단서 조합 → TV에 전파 → 망자의 세계로
(function () {
  const { W, H } = ME;
  const I = ME.INVESTIGATE;
  const T = ME.INVESTIGATE_TEXT;

  // 방 구조: 벽 두께 30, 가구는 충돌 사각형
  const WALL = 30;
  const FURNITURE = [
    { id: 'tv', x: 400, y: 30, w: 160, h: 26, color: 0x1a2028 },      // TV (위쪽 벽)
    { id: 'sofa', x: 380, y: 300, w: 200, h: 56, color: 0x3a4a5c },   // TV를 향한 소파
    { id: 'table', x: 430, y: 200, w: 100, h: 40, color: 0x2c3846 },  // 낮은 탁자
    { id: 'shelf', x: 760, y: 30, w: 170, h: 40, color: 0x2a3340 },   // 선반 (영화 단서 자리)
    { id: 'bed', x: 760, y: 360, w: 170, h: 150, color: 0x33404f },   // 침대
    { id: 'desk', x: 30, y: 380, w: 110, h: 130, color: 0x2c3846 },   // 책상 ('왜' 단서 자리)
  ];

  class InvestigateScene extends Phaser.Scene {
    constructor() { super('Investigate'); }

    create() {
      ME.sfx.bgmStart('investigate');
      this.events.once('shutdown', () => ME.sfx.bgmStop());
      this.cameras.main.setBackgroundColor('#0e131b');
      this.room = this.add.graphics(); this.drawRoom();
      this.gDyn = this.add.graphics();
      this.gFx = this.add.graphics();
      this.gHud = this.add.graphics().setDepth(10);
      this.gUi = this.add.graphics().setDepth(20);
      this.gCursor = this.add.graphics().setDepth(50);
      const font = { fontFamily: '"Malgun Gothic","Apple SD Gothic Neo",sans-serif' };
      this.font = font;
      this.txtObj = this.add.text(24, 18, '', { ...font, fontSize: '14px', color: '#cfe7f5' }).setDepth(11);
      this.txtCount = this.add.text(W - 24, 18, '', { ...font, fontSize: '14px', color: '#cfe7f5' }).setOrigin(1, 0).setDepth(11);
      this.txtSignal = this.add.text(24, H - 46, '신호', { ...font, fontSize: '12px', color: '#9fb3c8' }).setDepth(11);
      this.txtHint = this.add.text(W / 2, H - 40, '', { ...font, fontSize: '14px', color: '#e6edf5' }).setOrigin(0.5).setDepth(11);
      this.uiTexts = [];

      this.clues = ME.CLUES.map(c => ({ ...c, prog: 0, found: false }));
      this.player = { x: 480, y: 470 };
      this.mouse = { x: W / 2, y: H / 2, down: false, clicked: false };
      this.input.on('pointermove', p => { this.mouse.x = p.x; this.mouse.y = p.y; });
      this.input.on('pointerdown', p => { this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.down = true; this.mouse.clicked = true; });
      this.input.on('pointerup', () => { this.mouse.down = false; });
      this.input.on('gameout', () => { this.mouse.down = false; });
      this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
      this.input.setDefaultCursor('none');

      this.t = 0; this.sinceFound = 0; this.pulse = 0; this.pulses = [];
      this.sparks = []; this.waves = [];
      this.tvProg = 0;
      this.phase = 'intro';
      this.openPanel(T.intro, null);
      this.cameras.main.fadeIn(500, 0, 0, 0);
    }

    // ---------- 방 ----------
    drawRoom() {
      const g = this.room;
      g.fillStyle(0x1b2430, 1).fillRect(0, 0, W, H);
      // 바닥 격자
      g.lineStyle(1, 0x243041, 1);
      for (let x = WALL; x < W - WALL; x += 40) g.lineBetween(x, WALL, x, H - WALL);
      for (let y = WALL; y < H - WALL; y += 40) g.lineBetween(WALL, y, W - WALL, y);
      // 벽
      g.fillStyle(0x0b0f15, 1).fillRect(0, 0, W, WALL).fillRect(0, H - WALL, W, WALL).fillRect(0, 0, WALL, H).fillRect(W - WALL, 0, WALL, H);
      // 창문 + 네온 빛 (왼쪽 벽)
      g.fillStyle(0x16324a, 1).fillRect(0, 140, WALL, 120);
      g.fillStyle(0xff4fa3, 0.10).fillTriangle(WALL, 140, WALL, 260, 220, 300);
      g.fillStyle(0x3fd2ff, 0.08).fillTriangle(WALL, 150, WALL, 250, 200, 120);
      // 가구
      for (const f of FURNITURE) {
        g.fillStyle(f.color, 1).fillRect(f.x, f.y, f.w, f.h);
        g.lineStyle(1, 0x4a5a6e, 1).strokeRect(f.x, f.y, f.w, f.h);
      }
      // 소파 등받이 (아래쪽 = TV 반대편)
      g.fillStyle(0x2c394a, 1).fillRect(380, 342, 200, 14);
      // 침대 베개
      g.fillStyle(0x4a5a6e, 1).fillRect(775, 375, 60, 30).fillRect(855, 375, 60, 30);
      // 문 (아래쪽 벽)
      g.fillStyle(0x3a2e24, 1).fillRect(450, H - WALL, 60, WALL);
    }

    // ---------- 패널(카드) ----------
    openPanel(text, title, choices) {
      this.closePanel();
      this.gUi.fillStyle(0x0b0f15, 0.82).fillRect(0, 0, W, H);
      const bw = 560, bh = choices ? 340 : 220, bx = (W - bw) / 2, by = (H - bh) / 2;
      this.gUi.fillStyle(0x1e2835, 1).fillRect(bx, by, bw, bh);
      this.gUi.lineStyle(2, 0x78e6ff, 0.8).strokeRect(bx, by, bw, bh);
      const f = this.font;
      let y = by + 26;
      if (title) { this.uiTexts.push(this.add.text(W / 2, y, title, { ...f, fontSize: '20px', fontStyle: 'bold', color: '#bff3ff' }).setOrigin(0.5, 0).setDepth(21)); y += 44; }
      this.uiTexts.push(this.add.text(W / 2, y, text, { ...f, fontSize: '15px', color: '#e6edf5', align: 'center', wordWrap: { width: bw - 60 } }).setOrigin(0.5, 0).setDepth(21));
      this.choiceRects = [];
      if (choices) {
        choices.forEach((c, i) => {
          const cx = bx + 40 + (i % 2) * 250, cy = by + 170 + Math.floor(i / 2) * 64, cw = 230, ch = 48;
          this.gUi.fillStyle(0x2a3646, 1).fillRect(cx, cy, cw, ch);
          this.gUi.lineStyle(1, 0x5d6f85, 1).strokeRect(cx, cy, cw, ch);
          this.uiTexts.push(this.add.text(cx + cw / 2, cy + ch / 2, c, { ...f, fontSize: '16px', color: '#e6edf5' }).setOrigin(0.5).setDepth(21));
          this.choiceRects.push({ x: cx, y: cy, w: cw, h: ch, i });
        });
      } else {
        this.uiTexts.push(this.add.text(W / 2, by + bh - 28, '클릭해서 계속', { ...f, fontSize: '12px', color: '#7f93a8' }).setOrigin(0.5).setDepth(21));
      }
    }
    closePanel() { this.gUi.clear(); this.uiTexts.forEach(t => t.destroy()); this.uiTexts = []; this.choiceRects = null; }

    // ---------- 이동·충돌 ----------
    blocked(x, y) {
      const r = 14;
      if (x - r < WALL || x + r > W - WALL || y - r < WALL || y + r > H - WALL) return true;
      return FURNITURE.some(f => x + r > f.x && x - r < f.x + f.w && y + r > f.y && y - r < f.y + f.h);
    }
    move(dt) {
      const k = this.keys;
      let vx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
      let vy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
      const len = Math.hypot(vx, vy) || 1;
      vx = vx / len * I.moveSpeed * dt; vy = vy / len * I.moveSpeed * dt;
      const p = this.player;
      if (!this.blocked(p.x + vx, p.y)) p.x += vx;
      if (!this.blocked(p.x, p.y + vy)) p.y += vy;
    }

    // ---------- 전파 탐색 ----------
    inCone(tx, ty, range) {
      const p = this.player, d = Math.hypot(tx - p.x, ty - p.y);
      if (d > range) return false;
      const aim = Math.atan2(this.mouse.y - p.y, this.mouse.x - p.x), to = Math.atan2(ty - p.y, tx - p.x);
      return Math.abs(Phaser.Math.Angle.Wrap(to - aim)) < I.scanAngle;
    }
    signal() {
      // 가까울수록, 조준이 맞을수록 신호가 강해짐
      const p = this.player, aim = Math.atan2(this.mouse.y - p.y, this.mouse.x - p.x);
      let best = 0;
      for (const c of this.clues) {
        if (c.found) continue;
        const d = Math.hypot(c.x - p.x, c.y - p.y);
        const dist = Math.max(0, 1 - d / I.signalRange);
        const align = 0.6 + 0.4 * Math.cos(Phaser.Math.Angle.Wrap(Math.atan2(c.y - p.y, c.x - p.x) - aim));
        best = Math.max(best, dist * align);
      }
      return best;
    }
    scan(dt) {
      const scanning = this.mouse.down;
      for (const c of this.clues) {
        if (c.found) continue;
        if (scanning && this.inCone(c.x, c.y, I.scanRange)) {
          c.prog += dt / I.scanTime;
          if (c.prog >= 1) { this.foundClue(c); return; }
        } else c.prog = Math.max(0, c.prog - dt * 0.5);
      }
      if (scanning && Math.random() < dt * 12) {
        const p = this.player;
        this.waves.push({ x: p.x, y: p.y, ang: Math.atan2(this.mouse.y - p.y, this.mouse.x - p.x), r: 20, life: 0.5 });
      }
    }
    foundClue(c) {
      c.found = true; c.prog = 1; this.sinceFound = 0;
      this.cameras.main.shake(120, 0.004); ME.sfx.play('clue');
      this.phase = 'card';
      const n = this.clues.filter(q => q.found).length;
      this.openPanel(c.desc, c.name + '  (' + n + ' / ' + this.clues.length + ')');
    }

    // ---------- 메인 루프 ----------
    update(time, deltaMs) {
      const dt = Math.min(0.05, deltaMs / 1000), m = this.mouse;
      this.t += dt;
      if (this.phase === 'intro' || this.phase === 'card' || this.phase === 'wrong') {
        if (m.clicked) {
          ME.sfx.play('ui');
          this.closePanel();
          const all = this.clues.every(c => c.found);
          if (all && this.phase !== 'wrong') this.openDeduction();
          else if (this.phase === 'wrong') this.openDeduction();
          else this.phase = 'explore';
        }
      } else if (this.phase === 'deduce') {
        if (m.clicked && this.choiceRects) {
          const hit = this.choiceRects.find(r => m.x > r.x && m.x < r.x + r.w && m.y > r.y && m.y < r.y + r.h);
          if (hit) {
            this.closePanel();
            if (hit.i === ME.DEDUCTION.answer) { this.phase = 'open'; this.cameras.main.flash(200, 120, 230, 255); ME.sfx.play('correct'); }
            else { this.phase = 'wrong'; ME.sfx.play('wrong'); this.openPanel(ME.DEDUCTION.wrongHint, '다시 생각해 보자'); }
          }
        }
      } else if (this.phase === 'explore') {
        this.move(dt); this.scan(dt);
        this.sinceFound += dt;
      } else if (this.phase === 'open') {
        this.move(dt);
        // TV에 전파를 쏘아 출입구 열기
        const tv = FURNITURE[0], tx = tv.x + tv.w / 2, ty = tv.y + tv.h / 2;
        if (m.down && this.inCone(tx, ty, I.scanRange + 60)) {
          this.tvProg += dt / I.tvScanTime;
          if (Math.random() < dt * 12) this.waves.push({ x: this.player.x, y: this.player.y, ang: Math.atan2(ty - this.player.y, tx - this.player.x), r: 20, life: 0.5 });
          if (this.tvProg >= 1) this.enterTV();
        } else this.tvProg = Math.max(0, this.tvProg - dt * 0.4);
      }
      m.clicked = false;
      this.updateFx(dt);
      this.draw();
    }
    openDeduction() {
      this.phase = 'deduce';
      const list = this.clues.map(c => '· ' + c.name).join('\n');
      this.openPanel(list, ME.DEDUCTION.question, ME.DEDUCTION.choices);
    }
    enterTV() {
      this.phase = 'leaving'; ME.sfx.bgmStop(0.5); ME.sfx.play('warp');
      this.cameras.main.shake(600, 0.01);
      this.cameras.main.fadeOut(900, 255, 255, 255);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Chase'));
    }

    updateFx(dt) {
      // 연인 머리 위 전파 스파크
      const lover = this.clues[0];
      if (Math.random() < dt * 14) {
        const a = Math.random() * Math.PI * 2;
        this.sparks.push({ x: lover.x + Math.cos(a) * 12, y: lover.y - 6 + Math.sin(a) * 12, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, life: 0.3 });
      }
      this.sparks.forEach(s => { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; });
      this.sparks = this.sparks.filter(s => s.life > 0);
      this.waves.forEach(w => { w.r += 380 * dt; w.life -= dt; });
      this.waves = this.waves.filter(w => w.life > 0);
      // 신호 펄스: 신호가 강할수록 자주
      if (this.phase === 'explore') {
        const s = this.signal();
        this.pulse -= dt;
        if (s > 0.05 && this.pulse <= 0) { this.pulses.push({ r: 16, life: 0.6, s }); this.pulse = 1.1 - s * 0.95; ME.sfx.play('ping', s); }
      }
      this.pulses.forEach(q => { q.r += 120 * dt; q.life -= dt; });
      this.pulses = this.pulses.filter(q => q.life > 0);
    }

    // ---------- 그리기 ----------
    draw() {
      const g = this.gDyn, fx = this.gFx, h = this.gHud;
      g.clear(); fx.clear(); h.clear();
      // TV 노이즈 (기억 범람)
      const tv = FURNITURE[0];
      for (let i = 0; i < 6; i++) {
        const yy = tv.y + 3 + Math.random() * (tv.h - 6);
        g.lineStyle(2, Math.random() < 0.5 ? 0x78e6ff : 0xffffff, 0.25 + Math.random() * 0.4).lineBetween(tv.x + 6, yy, tv.x + tv.w - 6, yy);
      }
      if (this.phase === 'open' || this.phase === 'leaving') {
        g.lineStyle(3, 0x78e6ff, 0.5 + Math.sin(this.t * 8) * 0.4).strokeRect(tv.x - 4, tv.y - 4, tv.w + 8, tv.h + 8);
        if (this.tvProg > 0) g.fillStyle(0xffffff, this.tvProg * 0.8).fillRect(tv.x, tv.y, tv.w, tv.h);
      }
      // 소파의 연인 (옆모습, 머리가 전파에 감싸임)
      const lover = this.clues[0];
      g.fillStyle(0x8fa0b4, 1).fillCircle(lover.x, lover.y + 4, 13);
      g.fillStyle(0xc9d4df, 1).fillCircle(lover.x, lover.y - 8, 9);
      g.lineStyle(2, 0x78e6ff, 0.6 + Math.sin(this.t * 10) * 0.3).strokeCircle(lover.x, lover.y - 8, 14 + Math.sin(this.t * 6) * 2);
      for (const s of this.sparks) g.fillStyle(0xbff3ff, s.life * 3).fillRect(s.x - 1.5, s.y - 1.5, 3, 3);
      // 단서 ② TV는 TV 자체가 단서 / 단서 ③ 책상 위 안내문(종이)
      for (const c of this.clues) {
        if (c.id === 'why') {
          g.fillStyle(c.found ? 0xdff6ff : 0xc8ced6, 0.95).fillRect(c.x - 11, c.y - 8, 22, 16);
          g.lineStyle(1, 0x8090a0, 1).strokeRect(c.x - 11, c.y - 8, 22, 16);
          g.lineStyle(1, 0x8090a0, 0.8).lineBetween(c.x - 7, c.y - 3, c.x + 7, c.y - 3).lineBetween(c.x - 7, c.y + 1, c.x + 5, c.y + 1);
          g.fillStyle(0xb04040, 0.9).fillCircle(c.x + 6, c.y + 4, 2.5); // 관인
        }
      }
      // 판독 진행 링, 찾은 단서 표시
      for (const c of this.clues) {
        if (c.prog > 0 && !c.found) fx.lineStyle(3, 0x78e6ff, 0.9).beginPath().arc(c.x, c.y, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c.prog).strokePath();
      }
      // 막힘 방지 힌트: 오래 못 찾으면 가장 가까운 단서가 희미하게 반짝임
      const showHint = this.phase === 'explore' && this.sinceFound > I.hintDelay;
      let left = null;
      if (showHint) {
        const p = this.player;
        left = this.clues.filter(c => !c.found).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
        if (left) fx.lineStyle(2, 0xffffff, 0.25 + Math.sin(this.t * 4) * 0.2).strokeCircle(left.x, left.y, 30 + Math.sin(this.t * 4) * 4);
      }
      // 독백은 아직 못 찾은 단서 중 가장 가까운 것을 가리킨다 (11/23 피드백)
      this.txtHint.setText(left ? (T.hints[left.id] || '') : '');
      // 전파
      for (const w of this.waves) fx.lineStyle(2.5, 0x78e6ff, Math.max(0, w.life / 0.5)).beginPath().arc(w.x, w.y, w.r, w.ang - I.scanAngle, w.ang + I.scanAngle).strokePath();
      // 신호 펄스 (플레이어 주변)
      const p = this.player;
      for (const q of this.pulses) fx.lineStyle(2, 0x78e6ff, q.life * q.s * 1.4).strokeCircle(p.x, p.y, q.r);
      // 장의사 (탑뷰) + 조등 방향
      const aim = Math.atan2(this.mouse.y - p.y, this.mouse.x - p.x);
      g.fillStyle(0x5d6f85, 1).fillCircle(p.x, p.y, 14);
      g.lineStyle(1.5, 0x78e6ff, 0.9).strokeCircle(p.x, p.y, 14);
      g.lineStyle(5, 0x2b3442, 1).lineBetween(p.x, p.y, p.x + Math.cos(aim) * 24, p.y + Math.sin(aim) * 24);
      g.fillStyle(0x7fe6ff, 1).fillCircle(p.x + Math.cos(aim) * 24, p.y + Math.sin(aim) * 24, 2.5);
      // HUD
      const found = this.clues.filter(c => c.found).length;
      const obj = this.phase === 'open' || this.phase === 'leaving' ? T.objective3 : (found === this.clues.length ? T.objective2 : T.objective1);
      this.txtObj.setText('목표: ' + obj);
      this.txtCount.setText('단서 ' + found + ' / ' + this.clues.length);
      h.fillStyle(0x0b0f15, 0.6).fillRect(16, H - 52, 200, 34);
      const s = this.phase === 'explore' ? this.signal() : 0;
      h.fillStyle(0x2a3646, 1).fillRect(56, H - 42, 150, 12);
      h.fillStyle(s > 0.6 ? 0xbff3ff : 0x78e6ff, 1).fillRect(56, H - 42, 150 * s, 12);
      // 커서 (패널 위에도 보이도록 최상단 레이어)
      const m = this.mouse, cg = this.gCursor; cg.clear();
      cg.lineStyle(1.5, m.down ? 0xbff3ff : 0x9fb3c8, 1).strokeCircle(m.x, m.y, 9);
      cg.beginPath().moveTo(m.x - 14, m.y).lineTo(m.x - 5, m.y).moveTo(m.x + 5, m.y).lineTo(m.x + 14, m.y)
        .moveTo(m.x, m.y - 14).lineTo(m.x, m.y - 5).moveTo(m.x, m.y + 5).lineTo(m.x, m.y + 14).strokePath();
    }
  }
  ME.InvestigateScene = InvestigateScene;
})();
