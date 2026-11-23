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
      this.gFx = this.add.graphics().setDepth(6);
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
      this.player = { x: I.startX || 480, y: I.startY || 470 };
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
      this.coach = new ME.Coach(this, 82);
      this.tut = { stage: 0, moved: 0, lastX: this.player.x, lastY: this.player.y, aimT: 0 };
      this.txtHint.setPosition(W / 2, H - 40);
      ME.applyLook(this);
      this.cameras.main.fadeIn(500, 0, 0, 0);
    }

    // ---------- 방 ----------
    drawRoom() {
      const g = this.room, hs = ME.hash;
      // 바닥: 가로 나무판
      g.fillStyle(0x2a1f1a, 1).fillRect(0, 0, W, H);
      for (let y = WALL, r = 0; y < H - WALL; y += 20, r++) {
        const tone = [0x3a2a20, 0x35261d, 0x3e2d22][r % 3];
        g.fillStyle(tone, 1).fillRect(WALL, y, W - WALL * 2, 18);
        g.fillStyle(0x1e1612, 1).fillRect(WALL, y + 18, W - WALL * 2, 2);
        let x = WALL + Math.floor(hs(r * 3.1) * 120);
        while (x < W - WALL) { g.fillStyle(0x1e1612, 1).fillRect(x, y, 2, 18); x += 120 + Math.floor(hs(x + r) * 80); }
        g.fillStyle(0x4a372a, 0.6).fillRect(WALL, y, W - WALL * 2, 1);
      }
      // 러그 (소파와 탁자 아래)
      g.fillStyle(0x3a2433, 1).fillRect(350, 170, 260, 200);
      g.fillStyle(0x5a3448, 1).fillRect(358, 178, 244, 184);
      g.lineStyle(2, 0x8a5a6a, 0.8).strokeRect(370, 190, 220, 160);
      // 벽: 두께 + 안쪽 걸레받이 선
      g.fillStyle(0x12161f, 1).fillRect(0, 0, W, WALL).fillRect(0, H - WALL, W, WALL).fillRect(0, 0, WALL, H).fillRect(W - WALL, 0, WALL, H);
      g.fillStyle(0x232a38, 1).fillRect(WALL, WALL - 4, W - WALL * 2, 4).fillRect(WALL, H - WALL, W - WALL * 2, 3)
        .fillRect(WALL - 4, WALL, 4, H - WALL * 2).fillRect(W - WALL, WALL, 3, H - WALL * 2);
      // 창문 (왼쪽 벽) + 밖의 네온
      g.fillStyle(0x0a1a2a, 1).fillRect(4, 140, WALL - 8, 120);
      g.fillStyle(0xff4fa3, 0.8).fillRect(8, 150, 4, 40); g.fillStyle(0x3fd2ff, 0.8).fillRect(14, 200, 4, 50);
      g.fillStyle(0x2c3446, 1).fillRect(4, 198, WALL - 8, 3);
      g.fillStyle(0xff4fa3, 0.10).fillTriangle(WALL, 140, WALL, 260, 240, 310);
      g.fillStyle(0x3fd2ff, 0.08).fillTriangle(WALL, 150, WALL, 250, 220, 110);
      // 가구 공용: 윗면 + 앞면(아래쪽 두께)
      const box = (x, y, w, h, top, front, d = 8) => {
        g.fillStyle(0x000000, 0.35).fillRect(x + 4, y + 6, w, h);           // 그림자
        g.fillStyle(front, 1).fillRect(x, y + h - d, w, d);
        g.fillStyle(top, 1).fillRect(x, y, w, h - d);
        g.fillStyle(0xffffff, 0.08).fillRect(x, y, w, 2);
      };
      // TV장 + TV
      box(390, 30, 180, 34, 0x3a2a20, 0x241a14, 8);
      g.fillStyle(0x0c0f14, 1).fillRect(400, 30, 160, 26);
      // 선반 (영화 상자들)
      box(760, 30, 170, 40, 0x4a3628, 0x2e2018, 10);
      for (let i = 0, x = 768; x < 920; i++) { const w = 6 + Math.floor(hs(i) * 6); g.fillStyle([0x8a3a3a, 0x3a5a8a, 0xc9a24a, 0x4a7a5a, 0xd8d0c0][i % 5], 1).fillRect(x, 34, w, 22); x += w + 2; }
      // 탁자 (리모컨, 컵 두 개)
      box(430, 200, 100, 40, 0x6a4a32, 0x3e2a1c, 6);
      g.fillStyle(0x1a1a1a, 1).fillRect(450, 210, 18, 6);
      g.fillStyle(0xd8d0c0, 1).fillCircle(495, 214, 5).fillCircle(512, 220, 5);
      g.fillStyle(0x6a3a2a, 1).fillCircle(495, 214, 3).fillCircle(512, 220, 3);
      // 소파 (TV를 향함, 등받이는 아래쪽)
      box(380, 300, 200, 56, 0x4a5a78, 0x2c3650, 6);
      g.fillStyle(0x3a4862, 1).fillRect(380, 300, 16, 50).fillRect(564, 300, 16, 50);   // 팔걸이
      g.fillStyle(0x2c3650, 1).fillRect(380, 338, 200, 14);                              // 등받이
      g.fillStyle(0x5a6a88, 1).fillRect(400, 306, 78, 30).fillRect(482, 306, 78, 30);    // 방석
      g.fillStyle(0x3a4862, 1).fillRect(479, 306, 3, 30);
      // 침대 (이불 주름, 베개)
      box(760, 360, 170, 150, 0x5a4636, 0x3a2a20, 8);
      g.fillStyle(0xd8d0c4, 1).fillRect(768, 368, 154, 132);
      g.fillStyle(0x6a7a9a, 1).fillRect(768, 420, 154, 80);
      g.fillStyle(0x56668a, 1); for (let i = 0; i < 4; i++) g.fillRect(768, 432 + i * 16, 154, 2);
      g.fillStyle(0xf0ebe2, 1).fillRect(776, 376, 60, 30).fillRect(850, 376, 60, 30);
      g.fillStyle(0xc9c0b2, 1).fillRect(776, 402, 60, 4).fillRect(850, 402, 60, 4);
      // 책상 (스탠드, 서류 더미)
      box(30, 380, 110, 130, 0x5a4030, 0x3a2a1e, 8);
      g.fillStyle(0x2a2a30, 1).fillCircle(112, 400, 9); g.fillStyle(0xffd28a, 1).fillCircle(112, 400, 4);
      g.fillStyle(0xc8c2b4, 1).fillRect(46, 470, 26, 18).fillRect(50, 466, 26, 18);
      g.fillStyle(0x2a1e16, 1).fillRect(140, 430, 22, 40);                                   // 의자
      // 화분 두 개
      [[60, 60], [700, 470]].forEach(([x, y]) => { g.fillStyle(0x5a3a2a, 1).fillRect(x - 9, y - 9, 18, 18); g.fillStyle(0x3a6a4a, 1).fillCircle(x - 4, y - 4, 9).fillCircle(x + 5, y - 2, 8).fillCircle(x, y + 4, 8); g.fillStyle(0x5a8a5a, 1).fillCircle(x - 2, y - 5, 4); });
      // 문 (아래쪽 벽)
      g.fillStyle(0x4a3628, 1).fillRect(450, H - WALL, 60, WALL);
      g.fillStyle(0xc9a24a, 1).fillRect(500, H - WALL + 12, 4, 4);

      // 어둠 레이어: 빛이 닿는 곳만 지운다
      if (!this.textures.exists('inv-light')) {
        const t = this.textures.createCanvas('inv-light', 256, 256), c = t.getContext();
        const gr = c.createRadialGradient(128, 128, 0, 128, 128, 128);
        gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = gr; c.fillRect(0, 0, 256, 256); t.refresh();
      }
    }

    drawDark() {
      if (!this.dark) this.dark = this.add.renderTexture(0, 0, W, H).setOrigin(0).setDepth(5);
      const d = this.dark, p = this.player;
      d.clear().fill(0x04060c, 0.8);
      const L = (x, y, r) => { const img = this.make.image({ x, y, key: 'inv-light', add: false }).setScale(r / 128); d.erase(img); img.destroy(); };
      L(p.x, p.y, 170 + Math.sin(this.t * 3) * 6);          // 조등
      L(480, 90, 190 + Math.random() * 14);                 // TV 불빛 (깜빡임)
      L(60, 200, 170);                                      // 창문 네온
      L(112, 400, 90);                                      // 책상 스탠드
      const aim = Math.atan2(this.mouse.y - p.y, this.mouse.x - p.x);
      if (this.mouse.down) L(p.x + Math.cos(aim) * 120, p.y + Math.sin(aim) * 120, 120);
    }

    // ---------- 패널(카드) ----------
    openPanel(text, title, choices) {
      this.closePanel();
      this.gUi.fillStyle(0x0b0f15, 0.82).fillRect(0, 0, W, H);
      const bw = choices ? 720 : 560, bh = choices ? 440 : 220, bx = (W - bw) / 2, by = (H - bh) / 2;
      this.gUi.fillStyle(0x1e2835, 1).fillRect(bx, by, bw, bh);
      this.gUi.lineStyle(2, 0x78e6ff, 0.8).strokeRect(bx, by, bw, bh);
      const f = this.font;
      let y = by + 26;
      if (title) { this.uiTexts.push(this.add.text(W / 2, y, title, { ...f, fontSize: '20px', fontStyle: 'bold', color: '#bff3ff' }).setOrigin(0.5, 0).setDepth(21)); y += 44; }
      this.uiTexts.push(this.add.text(W / 2, y, text, { ...f, fontSize: choices ? '14px' : '15px', color: '#e6edf5', align: choices ? 'left' : 'center', lineSpacing: 4, wordWrap: { width: bw - 60 } }).setOrigin(0.5, 0).setDepth(21));
      this.choiceRects = [];
      if (choices) {
        choices.forEach((c, i) => {
          const cw = 300, ch = 46, cx = bx + (bw - cw * 2 - 30) / 2 + (i % 2) * (cw + 30), cy = by + bh - 128 + Math.floor(i / 2) * 58;
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
        const dist = Math.pow(Math.max(0, 1 - d / I.signalRange), I.signalCurve || 1);
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
      this.updateCoach(dt);
      this.draw();
    }
    // 처음 하는 사람을 위한 단계별 조작 안내 (11/24 피드백: 무엇을 해야 할지 모르겠다)
    updateCoach(dt) {
      const tu = this.tut, p = this.player, c = this.coach;
      tu.moved += Math.hypot(p.x - tu.lastX, p.y - tu.lastY); tu.lastX = p.x; tu.lastY = p.y;
      const found = this.clues.filter(q => q.found).length;
      let step = null;
      if (this.phase === 'explore') {
        if (tu.stage === 0 && tu.moved > 90) tu.stage = 1;
        if (tu.stage === 1) { tu.aimT += dt; if (this.signal() > 0.5 || tu.aimT > 6) tu.stage = 2; }
        if (tu.stage === 2 && found > 0) tu.stage = 3;
        if (tu.stage === 0) step = { icon: 'keys', text: 'WASD 또는 방향키로 방 안을 걸어 보세요' };
        else if (tu.stage === 1) step = { icon: 'aim', text: '마우스로 조등을 겨눠 보세요. 신호 막대가 차오르는 쪽에 흔적이 있습니다', };
        else if (tu.stage === 2) step = { icon: 'hold', text: this.mouse.down ? '그대로 누르고 있으세요. 흔적에 빛이 닿으면 원이 채워집니다' : '신호가 강한 쪽을 겨누고 마우스 왼쪽 버튼을 꾹 누르고 있으세요' };
      } else if (this.phase === 'open') {
        const tv = FURNITURE[0];
        step = { icon: 'hold', text: 'TV 가까이 가서 TV를 겨누고 마우스를 꾹 눌러 출입구를 여세요', target: { x: tv.x + tv.w / 2, y: tv.y + tv.h / 2, r: 60 } };
      }
      c.set(step); c.update(dt);
    }
    openDeduction() {
      this.phase = 'deduce';
      // 단서마다 핵심 문장을 다시 보여 주고, 장의사의 수칙을 먼저 알려 준다 (11/24 피드백: 처음 하는 사람은 고를 근거가 없다)
      const list = this.clues.map(c => c.name + ': ' + c.desc.split('\n')[0].replace(/^"/, '')).join('\n') + '\n\n장의사의 수칙: ' + ME.DEDUCTION.wrongHint;
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
      g.fillStyle(0x6a5a7a, 1).fillRoundedRect(lover.x - 15, lover.y - 6, 30, 22, 6);   // 어깨 (가디건)
      g.fillStyle(0x3a2a24, 1).fillCircle(lover.x, lover.y - 8, 10);                    // 머리카락
      g.fillStyle(0x4a3a30, 1).fillCircle(lover.x - 3, lover.y - 11, 4);
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
      g.fillStyle(0x000000, 0.35).fillEllipse(p.x + 3, p.y + 5, 34, 26);
      g.fillStyle(0x161b26, 1).fillEllipse(p.x, p.y + 2, 30, 24);                       // 코트 어깨
      g.lineStyle(4, 0x161b26, 1).lineBetween(p.x, p.y, p.x + Math.cos(aim) * 22, p.y + Math.sin(aim) * 22);
      g.fillStyle(0x0c0f15, 1).fillCircle(p.x, p.y, 13);                                // 갓 챙
      g.fillStyle(0x1e2430, 1).fillCircle(p.x, p.y, 7);                                 // 갓 머리
      g.lineStyle(1, 0x7fe6ff, 0.6).strokeCircle(p.x, p.y, 13);
      const lx = p.x + Math.cos(aim) * 26, ly = p.y + Math.sin(aim) * 26;
      g.fillStyle(0x7fe6ff, 0.25).fillCircle(lx, ly, 9);
      g.fillStyle(0xbff6ff, 1).fillRect(lx - 3, ly - 3, 6, 6);
      this.drawDark();
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
