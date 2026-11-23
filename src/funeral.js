// 장례 구간 — 기사의 갑옷을 정해진 순서대로 뜯어내며(기억 장면 전환) 망자를 벗기고,
// 시네마틱으로 망자와 갈대밭이 사라진 뒤 현실의 방으로 돌아온다.
// 수치·문구는 config.js의 ME.FUNERAL / FUNERAL_PARTS / FUNERAL_CINEMA / FUNERAL_ROOM / FUNERAL_TEXT
(function () {
  const { W, H, GROUND } = ME;
  const font = { fontFamily: '"Malgun Gothic","Apple SD Gothic Neo",sans-serif' };
  const KX = W * 0.62, KY = GROUND;          // 기사 기준점 (말 발밑)
  const UX = W * 0.18;                         // 장의사 위치
  const S = 1.5;                               // 기사 확대 배율

  class FuneralScene extends Phaser.Scene {
    constructor() { super('Funeral'); }

    create() {
      ME.sfx.bgmStart('funeral');
      this.events.once('shutdown', () => { ME.sfx.humOff(); ME.sfx.bgmStop(); });
      this.F = ME.FUNERAL;
      this.phase = 'armor';      // armor → ripping → memory → (반복) → cinema → dissolve → white → room
      this.t = 0;
      this.parts = ME.FUNERAL_PARTS.map(p => ({ ...p, ...this.partGeom(p.id), ox: 0, oy: 0, state: 'on', vx: 0, vy: 0, life: 1 }));
      this.grab = null;
      this.sparks = [];
      this.mem = null;
      this.drop = 0;            // 말이 사라지면 기사가 내려선다
      this.spiritA = 0;
      this.cine = null;         // { t }
      this.room = null;         // { t, look, tv }
      this.reeds = [];
      for (let i = 0; i < 70; i++) this.reeds.push({ x: Math.random() * W, h: 60 + Math.random() * 90, ph: Math.random() * 6, near: Math.random() < 0.5, gone: Math.random() });

      this.cameras.main.setBackgroundColor('#fff3dc');
      ME.ChaseScene.prototype.makeBackground.call(this);
      this.sky = this.add.image(0, 0, 'chase-bg').setOrigin(0);
      this.hills = ['ch-hill1', 'ch-hill2', 'ch-hill3'].map((k, i) => this.add.tileSprite(0, 0, W, H, k).setOrigin(0).setTilePosition(300 + i * 200, 0));
      this.gBg = this.add.graphics();
      this.gWorld = this.add.graphics();
      this.gFx = this.add.graphics();
      this.gCursor = this.add.graphics().setDepth(50);
      this.gMem = this.add.graphics().setDepth(20);
      const txt = (x, y, size, color, depth) => this.add.text(x, y, '', { ...font, fontSize: size, color, align: 'center', wordWrap: { width: W - 160 }, lineSpacing: 6 }).setOrigin(0.5).setDepth(depth).setAlpha(0);
      this.memText = txt(W / 2, H - 70, '20px', '#fff6e4', 21);
      this.cineText = txt(W / 2, 110, '22px', '#ffffff', 21);
      this.roomText = txt(W / 2, H - 90, '18px', '#c9d4df', 21);
      this.memSkip = this.add.text(W - 24, H - 20, ME.FUNERAL_TEXT.memSkip, { ...font, fontSize: '12px', color: '#d8c8b0' }).setOrigin(1, 1).setDepth(21).setAlpha(0);
      this.endText = this.add.text(W / 2, H - 36, ME.FUNERAL_TEXT.end, { ...font, fontSize: '13px', color: '#7f93a8' }).setOrigin(0.5).setAlpha(0).setDepth(21);
      this.prompt = this.add.text(W / 2, H - 22, ME.FUNERAL_TEXT.prompt, { ...font, fontSize: '12px', color: '#f4ead8', backgroundColor: '#2a334066', padding: { x: 8, y: 3 } }).setOrigin(0.5).setDepth(10);
      this.markText = this.add.text(0, 0, ME.FUNERAL_TEXT.mark, { ...font, fontSize: '13px', color: '#ffffff', backgroundColor: '#2a334099', padding: { x: 6, y: 3 } }).setOrigin(0.5, 1).setDepth(15).setAlpha(0);

      this.input.on('pointerdown', p => this.onDown(p));
      this.input.on('pointerup', () => this.onUp());
      ME.applyLook(this);
      this.cameras.main.fadeIn(900, 255, 255, 255);
    }

    partGeom(id) {
      const g = ME.KNIGHT_PARTS[id];
      return { ax: KX + g.x * S, ay: KY + g.y * S, r: g.r * S };
    }
    // 기사 몸에 붙은 파츠는 말에서 내려서면 함께 내려간다
    partPos(q) { const dy = q.id === 'horse' ? 0 : this.drop * 40 * S; return { x: q.ax, y: q.ay + dy }; }
    nextPart() { return this.parts.find(q => q.state === 'on' || q.state === 'grab'); }

    onDown(p) {
      if (this.phase === 'memory') { if (this.mem && this.mem.t > 0.8) this.endMemory(); return; }
      if (this.phase !== 'armor') return;
      const q = this.nextPart(); if (!q) return;
      const pp = this.partPos(q);
      if (Math.hypot(p.x - pp.x, p.y - pp.y) < q.r * 1.3) { this.grab = { part: q, sx: p.x, sy: p.y }; q.state = 'grab'; ME.sfx.play('grab'); }
    }

    onUp() {
      if (!this.grab) return;
      const q = this.grab.part;
      if (q.state === 'grab') { q.state = 'on'; this.tweens.add({ targets: q, ox: 0, oy: 0, duration: 220, ease: 'Back.Out' }); }
      this.grab = null;
    }

    rip(q, dx, dy) {
      const d = Math.hypot(dx, dy) || 1, pp = this.partPos(q);
      q.state = 'off'; ME.sfx.play(q.id === 'horse' ? 'ripBig' : 'rip');
      if (q.id === 'horse') { q.vx = 0; q.vy = 0; this.burst(pp.x, pp.y, 60, true); this.tweens.add({ targets: this, drop: 1, duration: 500, ease: 'Bounce.Out' }); }
      else { q.vx = dx / d * 520; q.vy = dy / d * 520 - 200; this.burst(pp.x, pp.y, 26, true); }
      this.grab = null;
      this.phase = 'ripping';
      this.cameras.main.shake(180, 0.012);
      this.time.delayedCall(650, () => {
        this.cameras.main.flash(450, 255, 248, 230);
        this.mem = { part: q, t: 0 };
        this.phase = 'memory'; ME.sfx.play('memory');
        this.memText.setText(q.line).setAlpha(0);
        this.tweens.add({ targets: this.memText, alpha: 1, delay: 500, duration: 700 });
        this.tweens.add({ targets: this.memSkip, alpha: 0.8, delay: 1200, duration: 400 });
      });
    }

    endMemory() {
      this.mem = null;
      this.tweens.killTweensOf(this.memText); this.tweens.killTweensOf(this.memSkip);
      this.memText.setAlpha(0); this.memSkip.setAlpha(0); this.gMem.clear();
      this.cameras.main.flash(350, 255, 248, 230);
      if (this.parts.every(p => p.state === 'off')) { this.phase = 'cinema'; this.cine = { t: 0, prog: 0, line: -1 }; this.prompt.setText(ME.FUNERAL_TEXT.spirit).setFontSize(15).setY(H - 62); }
      else this.phase = 'armor';
    }

    burst(x, y, n, data) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 220;
        this.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5 + Math.random() * 0.5, c: data && Math.random() < 0.5 ? 0x78e6ff : 0xffffff, g: 200 });
      }
    }

    update(time, deltaMs) {
      const dt = Math.min(deltaMs / 1000, 0.05);
      this.t += dt;
      const F = this.F, p = this.input.activePointer;

      if (this.phase === 'armor' && this.grab) {
        const q = this.grab.part, dx = p.x - this.grab.sx, dy = p.y - this.grab.sy, d = Math.hypot(dx, dy);
        const k = q.id === 'horse' ? 0.2 : F.follow; // 말은 더 무겁다
        q.ox = dx * k + (Math.random() - 0.5) * d * 0.04;
        q.oy = dy * k + (Math.random() - 0.5) * d * 0.04;
        const pp = this.partPos(q);
        if (Math.random() < d / F.ripDist * 0.8) this.burst(pp.x + q.ox, pp.y + q.oy, 1, true);
        if (d > F.ripDist) this.rip(q, dx, dy);
      }
      if (this.phase !== 'cinema') this.prompt.setAlpha(this.phase === 'armor' ? (this.grab ? 0.3 : 1) : 0);

      if (this.phase === 'memory' && this.mem) { this.mem.t += dt; if (this.mem.t > F.memoryTime) this.endMemory(); }

      for (const q of this.parts) if (q.state === 'off') {
        if (q.id === 'horse') q.life -= dt * 1.6;          // 말은 빛으로 흩어진다
        else { q.ox += q.vx * dt; q.oy += q.vy * dt; q.vy += 900 * dt; q.life -= dt * 0.7; }
      }

      // 시네마틱: 데이터 망자 등장 → 조등을 대고 누르는 동안 마지막 독백이 진행 → 다 누르면 소멸
      if (this.phase === 'cinema') {
        const c = this.cine; c.t += dt;
        this.spiritA = Math.min(1, c.t / 1.2);
        const sx = KX, sy = KY - (110 - this.drop * 40) * S;
        const holding = c.t > 1.2 && p.isDown && Math.hypot(p.x - sx, p.y - sy) < F.spiritRadius;
        c.holding = holding;
        if (holding) ME.sfx.humOn(c.prog); else ME.sfx.humOff();
        if (holding) {
          c.prog = Math.min(1, c.prog + dt / F.spiritHold);
          if (Math.random() < 0.6) this.burst(sx + (Math.random() - 0.5) * 80, sy + (Math.random() - 0.5) * 140, 1, true);
          this.cameras.main.shake(60, 0.002 + c.prog * 0.005);
        }
        const lines = ME.FUNERAL_CINEMA;
        const idx = Math.min(lines.length - 1, Math.floor(c.prog * lines.length));
        if (c.prog > 0.01 && idx !== c.line) {
          c.line = idx; this.tweens.killTweensOf(this.cineText);
          this.cineText.setText(lines[idx]).setAlpha(0);
          this.tweens.add({ targets: this.cineText, alpha: 1, duration: 600 });
        }
        this.prompt.setAlpha(holding ? 0.25 : 1);
        if (c.prog >= 1) {
          this.phase = 'dissolve'; this.diss = 0; this.prompt.setText(''); ME.sfx.humOff(); ME.sfx.bgmStop(1.5); ME.sfx.play('dissolve');
          this.tweens.add({ targets: this.cineText, alpha: 0, delay: 1200, duration: 1200 });
        }
      }
      if (this.phase === 'dissolve') {
        this.diss = Math.min(1, this.diss + dt / F.dissolve);
        // 망자가 빛 조각으로 위로 흩어진다
        if (Math.random() < 0.9 * (1 - this.diss)) {
          const sx = KX + (Math.random() - 0.5) * 80, sy = KY - 110 * S + (Math.random() - 0.5) * 140;
          this.sparks.push({ x: sx, y: sy, vx: (Math.random() - 0.5) * 30, vy: -60 - Math.random() * 80, life: 1.5, c: Math.random() < 0.5 ? 0x78e6ff : 0xffffff, g: -10 });
        }
        if (this.diss >= 1) {
          this.phase = 'white';
          this.cameras.main.fadeOut(1400, 255, 255, 255);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.time.delayedCall(F.roomDelay * 1000, () => {
              this.phase = 'room'; this.room = { t: 0, beat: -1, look: 0, tv: 0 };
              this.input.setDefaultCursor('default');
              this.cameras.main.fadeIn(1600, 0, 0, 0);
            });
          });
        }
      }

      // 현실의 방: 연인의 짧은 장면들
      if (this.phase === 'room' && this.room) {
        const r = this.room; r.t += dt;
        const beats = ME.FUNERAL_ROOM;
        for (let i = r.beat + 1; i < beats.length; i++) {
          if (r.t >= beats[i].at) {
            r.beat = i;
            this.tweens.killTweensOf(this.roomText);
            this.roomText.setText(beats[i].text).setAlpha(0); ME.sfx.play('line');
            this.tweens.add({ targets: this.roomText, alpha: 1, duration: 900 });
            const act = beats[i].act;
            if (act === 'look') this.tweens.add({ targets: r, look: 0.5, duration: 1200 });
            if (act === 'tv') this.tweens.add({ targets: r, tv: 1, duration: 600 });
            if (act === 'lookLeft') this.tweens.add({ targets: r, look: -1, duration: 1400 });
          } else break;
        }
        const last = beats[beats.length - 1].at;
        if (r.t > last + 3.5 && this.endText.alpha === 0) {
          ME.sfx.play('end');
          this.tweens.add({ targets: this.endText, alpha: 1, duration: 800, onComplete: () => this.input.once('pointerdown', () => this.scene.start('Title')) });
        }
      }

      for (const s of this.sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += s.g * dt; s.life -= dt; }
      this.sparks = this.sparks.filter(s => s.life > 0);
      this.draw();
    }

    draw() {
      const bg = this.gBg, g = this.gWorld, fx = this.gFx;
      bg.clear(); g.clear(); fx.clear(); this.gMem.clear();
      if (this.phase === 'room') { this.gCursor.clear(); this.markText.setAlpha(0); this.drawRoom(bg); return; }

      const removed = this.parts.filter(q => q.state === 'off').length;
      const diss = this.phase === 'dissolve' || this.phase === 'white' ? this.diss : 0;
      const fade = 1 - (removed / this.parts.length) * 0.75;
      // 하늘·땅
      const skyA = Math.max(0.12, fade) * (1 - diss);
      this.sky.setAlpha(skyA); this.hills.forEach((h, i) => h.setAlpha(skyA * (0.85 + i * 0.05)));
      bg.fillStyle(0x2a0f1e, Math.max(0.15, fade) * (1 - diss)).fillRect(0, GROUND, W, H - GROUND);
      bg.fillStyle(0xff9a6a, 0.55 * fade * (1 - diss)).fillRect(0, GROUND, W, 2);
      // 갈대: 소멸 단계에서 하나씩 사라진다
      for (const r of this.reeds) {
        const ra = r.gone < diss ? 0 : 1;
        if (!ra) continue;
        const sway = Math.sin(this.t * 1.6 + r.ph) * 8;
        g.lineStyle(r.near ? 3 : 2, r.near ? 0x3a1428 : 0x5a2440, (r.near ? 1 : 0.85) * Math.max(0.3, fade)).lineBetween(r.x, GROUND, r.x + sway, GROUND - r.h);
        g.fillStyle(r.near ? 0x3a1428 : 0x5a2440, Math.max(0.3, fade)).fillEllipse(r.x + sway, GROUND - r.h, 6, 16);
        g.fillStyle(0xff9a6a, 0.5 * fade).fillRect(r.x + sway + 1, GROUND - r.h - 6, 2, 6);
      }
      // 장의사
      ME.drawUndertaker(g, UX, GROUND, { a: 1 - diss });

      this.drawKnight(g);
      // 색을 잃은 세계는 어두운 회청색으로 가라앉는다
      g.fillStyle(0x2a3340, (1 - fade) * 0.75 * (1 - diss)).fillRect(0, 0, W, H);
      if (this.spiritA > 0) this.drawSpirit(fx, diss);
      if (this.phase === 'cinema' && this.cine.holding) {
        const sx = KX, sy = KY - (110 - this.drop * 40) * S;
        for (let i = 0; i < 8; i++) {
          const k = (this.t * 1.5 + i / 8) % 1;
          fx.lineStyle(2, ME.COLORS.wave, 0.7 * (1 - k)).strokeCircle(UX + 20 + (sx - UX - 40) * k, GROUND - 80 + (sy - GROUND + 80) * k, 10 + k * 30);
        }
      }
      if (this.phase === 'cinema' && this.cine.prog > 0) {
        fx.fillStyle(0xffffff, 0.2).fillRect(W / 2 - 160, H - 42, 320, 4);
        fx.fillStyle(0xffffff, 0.8).fillRect(W / 2 - 160, H - 42, 320 * this.cine.prog, 4);
      }
      for (const s of this.sparks) fx.fillStyle(s.c, Math.min(1, s.life * 2)).fillRect(s.x - 1.5, s.y - 1.5, 3, 3);

      // 다음에 뜯어낼 파츠 표시
      const nq = this.phase === 'armor' && !this.grab ? this.nextPart() : null;
      if (nq) {
        const pp = this.partPos(nq), pr = nq.r * (1.15 + Math.sin(this.t * 5) * 0.12);
        fx.lineStyle(2.5, 0xffffff, 0.9).strokeCircle(pp.x, pp.y, pr);
        fx.lineStyle(1.5, ME.COLORS.wave, 0.7).strokeCircle(pp.x, pp.y, pr + 6);
      }
      // 데이터 망자 안내: 누를 곳을 갑옷 표시와 같은 깜빡이는 원으로 (11/23 피드백)
      if (this.phase === 'cinema' && this.cine.t > 1.2 && !this.cine.holding && this.cine.prog < 1) {
        const sx = KX, sy = KY - (110 - this.drop * 40) * S, pr = 34 * (1.15 + Math.sin(this.t * 5) * 0.12);
        fx.lineStyle(2.5, 0xffffff, 0.9).strokeCircle(sx, sy, pr);
        fx.lineStyle(1.5, ME.COLORS.wave, 0.7).strokeCircle(sx, sy, pr + 6);
      }
      this.markText.setAlpha(0);

      if (this.phase === 'memory' && this.mem) this.drawMemory(this.gMem, this.mem.part.scene, this.mem.t);
      this.drawCursor();
    }

    drawCursor() {
      const m = this.input.activePointer, cg = this.gCursor; cg.clear();
      if (this.phase === 'dissolve' || this.phase === 'white') return;
      const removed = this.parts.filter(q => q.state === 'off').length;
      const on = !!this.grab || (this.phase === 'cinema' && this.cine && this.cine.holding);
      const cc = on ? 0x78e6ff : (this.phase === 'memory' || this.phase === 'cinema' || removed >= 3 ? 0xe6edf5 : 0x3a2a18);
      cg.lineStyle(1.5, cc, 1).strokeCircle(m.x, m.y, 9);
      cg.beginPath().moveTo(m.x - 14, m.y).lineTo(m.x - 5, m.y).moveTo(m.x + 5, m.y).lineTo(m.x + 14, m.y)
        .moveTo(m.x, m.y - 14).lineTo(m.x, m.y - 5).moveTo(m.x, m.y + 5).lineTo(m.x, m.y + 14).strokePath();
    }

    drawKnight(g) {
      const body = 1 - this.spiritA;
      const shake = this.grab ? (Math.random() - 0.5) * 3 : 0;
      const parts = {};
      for (const q of this.parts) parts[q.id] = { a: q.state === 'off' ? Math.max(0, q.life) : body, ox: q.ox, oy: q.oy };
      ME.drawKnight(g, KX + shake, KY, S, { body, parts, drop: this.drop });
      if (this.grab) { const q = this.grab.part, pp = this.partPos(q); g.lineStyle(2, ME.COLORS.wave, 0.8).strokeCircle(pp.x + q.ox, pp.y + q.oy, q.r); }
    }

    // 데이터가 된 망자: 빛나는 혼령 형체 + 전기 균열 + 데이터 조각 (오리지널 표현)
    drawSpirit(g, diss) {
      const A = this.spiritA * (1 - diss);
      if (A <= 0) return;
      const cx = KX + (Math.random() - 0.5) * 3, cy = KY - (110 - this.drop * 40) * S - diss * 60;
      for (let i = 6; i >= 1; i--) g.fillStyle(0xffffff, A * 0.09 * (7 - i)).fillEllipse(cx, cy, 70 * i * 0.3 * S, 110 * i * 0.3 * S);
      for (let i = 0; i < 22; i++) {
        const x = cx + (Math.random() - 0.5) * 70 * S, h = (40 + Math.random() * 100) * S;
        g.lineStyle(1 + Math.random() * 2, 0xffffff, A * (0.4 + Math.random() * 0.6)).lineBetween(x, cy - h / 2, x, cy + h / 2);
      }
      for (let k = 0; k < 6; k++) {
        let x = cx + (Math.random() - 0.5) * 60 * S, y = cy + (Math.random() - 0.5) * 100 * S;
        g.lineStyle(1.5, Math.random() < 0.5 ? 0x9aa6b4 : ME.COLORS.wave, A * 0.8).beginPath().moveTo(x, y);
        for (let j = 0; j < 5; j++) { x += (Math.random() - 0.5) * 30; y += (Math.random() - 0.5) * 30; g.lineTo(x, y); }
        g.strokePath();
      }
      for (let i = 0; i < 8; i++) g.fillStyle(ME.COLORS.wave, A * 0.5 * Math.random()).fillRect(cx + (Math.random() - 0.5) * 120, cy + (Math.random() - 0.5) * 180, 4 + Math.random() * 18, 2);
    }

    // ---------- 기억 장면 (갑옷을 뜯을 때마다 한 장면씩) ----------
    // 정면 시점(소파 뒤에서 TV를 보는 구도). 바랜 필름 느낌: 따뜻한 톤 + 비네트 + 노이즈
    drawMemory(g, id, t) {
      const fl = 0.92 + Math.random() * 0.08; // 필름 깜빡임
      const appear = Math.min(1, t / 0.6);
      const tone = { sofa: 0x2e2218, fight: 0x221c20, forget: 0xcfd6dc, alone: 0x1c1a1a, street: 0x10162a }[id];
      g.fillStyle(tone, appear).fillRect(0, 0, W, H);
      const heads = (list, a) => { for (const [x, y, c] of list) { g.fillStyle(c || 0x14100c, a).fillCircle(x, y, 26); g.fillRect(x - 30, y + 20, 60, 50); } };
      const tv = (x, y, w, h, on, a) => {
        g.fillStyle(0x0a0a0c, a).fillRect(x - 8, y - 8, w + 16, h + 16);
        if (on) {
          g.fillStyle(0xbfe9ff, a * 0.95 * fl).fillRect(x, y, w, h);
          g.fillStyle(0xffd28a, a * 0.8).fillRect(x, y + h * 0.62, w, h * 0.38); // 갈대밭
          g.fillStyle(0x6b3e1f, a).fillRect(x + w * 0.45, y + h * 0.5, 30, 12);   // 화면 속 기사
          g.fillStyle(0xe9c46a, a).fillRect(x + w * 0.5, y + h * 0.36, 8, 16);
          for (let i = 3; i >= 1; i--) g.fillStyle(0xbfe9ff, a * 0.035).fillEllipse(x + w / 2, y + h + 40, w * (0.9 + i * 0.35), 70 + i * 50); // 방을 비추는 빛
        } else g.fillStyle(0x16161a, a).fillRect(x, y, w, h);
      };
      const sofa = (a) => { g.fillStyle(0x5a4636, a).fillRoundedRect(220, 370, 520, 120, 18); g.fillStyle(0x4a382a, a).fillRoundedRect(200, 350, 60, 140, 14).fillRoundedRect(700, 350, 60, 140, 14); };

      if (id === 'sofa') {           // 1. 매일 밤, 같은 소파에서 같은 기사를 응원
        tv(330, 90, 300, 180, true, appear); sofa(appear);
        heads([[400, 330], [560, 330]], appear);
        g.fillStyle(0xffe7b0, appear * 0.5).fillCircle(560 + Math.sin(t * 3) * 2, 300, 5); // 그녀의 웃음(작은 빛)
      } else if (id === 'fight') {   // 2. 처음으로 TV를 끄고 싸웠다
        tv(330, 90, 300, 180, false, appear);
        g.fillStyle(0x3a2e26, appear).fillRect(380, 380, 200, 40);                 // 탁자
        g.fillStyle(0xe8e2d6, appear).fillRect(455, 368, 50, 14);                  // 통지서
        g.fillStyle(0xb04040, appear).fillCircle(495, 375, 3);
        g.fillStyle(0x14100c, appear).fillCircle(250, 250, 24).fillRect(226, 270, 48, 140); // 그
        g.fillStyle(0x14100c, appear).fillCircle(710, 245, 24).fillRect(686, 265, 48, 145); // 그녀
        g.fillRect(660, 300, 30, 8);                                                   // 내민 손
        g.fillStyle(0xb04040, 0.12 + Math.sin(t * 6) * 0.06).fillRect(0, 0, W, H);    // 긴장
      } else if (id === 'forget') {  // 3. 끝내자는 말도 못 한 채, 그녀의 기억에서 사라졌다
        const k = Math.min(1, t / 3.5);
        g.fillStyle(0xffffff, appear * 0.6).fillEllipse(W / 2, 60, 500, 160);       // 차가운 장례 시설 빛
        g.fillStyle(0x2a2f36, appear * (1 - k)).fillCircle(560, 230, 24).fillRect(536, 250, 48, 150); // 뒤돌아선 그녀
        for (let i = 0; i < 40 * k; i++) g.fillStyle(0xffffff, appear * Math.random()).fillRect(530 + Math.random() * 60, 380 - Math.random() * 260 * k, 3, 3); // 흩어지는 기억
        g.fillStyle(0x2a2f36, appear).fillCircle(300, 250, 22).fillRect(278, 270, 44, 135); // 그
        // (11/22 피드백: 손 뻗기 제거 — 그는 그대로 서 있고 그녀만 사라진다)
      } else if (id === 'alone') {   // 4. 지울 수 없었다. TV는 그날 이후 꺼진 적이 없다
        tv(330, 90, 300, 180, true, appear); sofa(appear);
        heads([[400, 335]], appear);
        g.fillStyle(0x3a2e26, appear).fillRoundedRect(520, 320, 80, 34, 10);          // 비어 있는 옆자리(눌린 쿠션)
        for (let i = 0; i < 9; i++) g.fillStyle(0x2a241e, appear).fillRect(150 + i * 75, 500 + (i % 3) * 8, 26, 14); // 쌓인 물건
        g.fillStyle(0x0a0a0c, appear * 0.35).fillRect(0, 0, W, H);                      // 더 어두운 방
      } else if (id === 'street') {  // 5. 거리에서 그녀를 봤다. 모든 밤이 겹쳐 보였다
        g.fillStyle(0x1e2640, appear).fillRect(0, 420, W, 120);
        g.fillStyle(0x30384e, appear).fillRect(180, 120, 8, 300);                          // 가로등
        g.fillStyle(0xffe7b0, appear * 0.12).fillTriangle(184, 130, 60, 420, 320, 420);
        g.fillStyle(0xffe7b0, appear * 0.9).fillCircle(184, 126, 7);
        for (let i = 0; i < 6; i++) g.fillStyle(0x0c1020, appear * 0.6).fillCircle(380 + i * 80, 300, 14).fillRect(368 + i * 80, 312, 24, 100); // 행인
        g.fillStyle(0xd8c8b0, appear).fillCircle(620, 290, 16).fillRect(604, 304, 32, 110);  // 그녀 (혼자 밝게)
        // 겹쳐 보이는 소파의 밤들 (어긋난 잔상 + 글리치)
        const over = Math.min(1, Math.max(0, (t - 0.8) / 1.6));
        for (let k = 0; k < 3; k++) {
          const ox = (Math.random() - 0.5) * 20 * over, a = over * 0.3;
          g.fillStyle(0xbfe9ff, a).fillRect(330 + ox + k * 14, 90 + k * 8, 300, 180);
          g.fillStyle(0x5a4636, a).fillRoundedRect(220 + ox, 370 + k * 6, 520, 90, 18);
        }
        for (let i = 0; i < 14 * over; i++) g.fillStyle(0x78e6ff, Math.random() * over).fillRect(Math.random() * W, Math.random() * H, 20 + Math.random() * 80, 2);
      }
      // 바랜 필름: 비네트 + 노이즈 + 아래 글 띠
      for (let i = 0; i < 12; i++) {
        const d = (12 - i) * 7, a2 = 0.035 * appear;
        g.fillStyle(0x000000, a2).fillRect(0, 0, W, d).fillRect(0, H - d, W, d).fillRect(0, 0, d, H).fillRect(W - d, 0, d, H);
      }
      for (let i = 0; i < 120; i++) g.fillStyle(0xffffff, Math.random() * 0.06 * appear).fillRect(Math.random() * W, Math.random() * H, 2, 2);
      g.fillStyle(0x000000, 0.45 * appear).fillRect(0, H - 120, W, 120);
    }


    // 엔딩: 현실의 방 (탑뷰). 망자는 사라지고 연인만 남는다
    drawRoom(g) {
      const r = this.room || { look: 0, tv: 0 };
      g.fillStyle(0x07090e, 1).fillRect(0, 0, W, H);
      const ox = W / 2 - 220, oy = 50;
      // 바닥 (추리 방과 같은 나무판)
      for (let y = 0, i = 0; y < 300; y += 20, i++) {
        g.fillStyle([0x3a2a20, 0x35261d, 0x3e2d22][i % 3], 1).fillRect(ox, oy + y, 440, 18);
        g.fillStyle(0x1e1612, 1).fillRect(ox, oy + y + 18, 440, 2);
        g.fillStyle(0x1e1612, 1).fillRect(ox + 40 + Math.floor(ME.hash(i) * 300), oy + y, 2, 18);
      }
      g.fillStyle(0x5a3448, 1).fillRect(ox + 100, oy + 120, 240, 150);
      g.lineStyle(2, 0x8a5a6a, 0.8).strokeRect(ox + 110, oy + 130, 220, 130);
      g.lineStyle(4, 0x12161f, 1).strokeRect(ox, oy, 440, 300);
      // TV장과 TV (리모컨을 누르면 켜진다)
      g.fillStyle(0x241a14, 1).fillRect(ox + 140, oy + 6, 160, 28);
      g.fillStyle(0x0c0f14, 1).fillRect(ox + 150, oy + 10, 140, 18);
      if (r.tv > 0) {
        g.fillStyle(0xbfe9ff, 0.8 * r.tv * (0.9 + Math.random() * 0.1)).fillRect(ox + 154, oy + 13, 132, 12);
        g.fillStyle(0xbfe9ff, 0.10 * r.tv).fillTriangle(ox + 150, oy + 28, ox + 290, oy + 28, ox + 220, oy + 240);
      }
      // 소파
      g.fillStyle(0x000000, 0.35).fillRect(ox + 124, oy + 206, 200, 50);
      g.fillStyle(0x2c3650, 1).fillRect(ox + 120, oy + 200, 200, 50);
      g.fillStyle(0x3a4862, 1).fillRect(ox + 120, oy + 200, 14, 44).fillRect(ox + 306, oy + 200, 14, 44);
      g.fillStyle(0x2c3650, 1).fillRect(ox + 120, oy + 238, 200, 12);
      g.fillStyle(0x4a5a78, 1).fillRect(ox + 138, oy + 206, 78, 28).fillRect(ox + 224, oy + 206, 78, 28);
      g.fillStyle(0x3a4862, 1).fillRect(ox + 146, oy + 214, 44, 14);   // 비어 있는 왼쪽 자리 (눌린 쿠션)
      // 연인 (오른쪽). look: 0 정면(TV), 0.5 소파를 둘러봄, -1 왼쪽 자리를 바라봄
      const a = 0.9 + Math.sin(this.t * 2) * 0.05, bx = ox + 272, by = oy + 222;
      g.fillStyle(0x6a5a7a, a).fillRoundedRect(bx - 14, by - 6, 28, 20, 6);
      const hx = bx + (r.look < 0 ? r.look * 5 : Math.sin(this.t * 1.5) * 3 * r.look), hy = by - 12 + (r.look < 0 ? 2 : 0);
      g.fillStyle(0x3a2a24, a).fillCircle(hx, hy, 9);
      g.fillStyle(0x4a3a30, a).fillCircle(hx - 3, hy - 3, 4);
      g.fillStyle(0x0c0f14, 1).fillRect(bx - 34, by + 2, 10, 4);       // 리모컨
      // 창밖 네온이 바닥에 비침
      g.fillStyle(0xff4fa3, 0.08).fillTriangle(ox, oy + 90, ox, oy + 200, ox + 160, oy + 230);
    }
  }

  ME.FuneralScene = FuneralScene;
})();
