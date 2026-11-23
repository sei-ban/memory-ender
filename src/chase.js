// 메모리 엔더 — 추격 구간 (망자의 세계, 사이드뷰)
// 포착(타이밍 클릭) → 흡수(연타) → 발사(망자 명중) ×5 → 마지막 붙잡기(홀드)
(function () {
  const { W, H, GROUND } = ME;
  const C = ME.CHASE;
  const COL = ME.COLORS;
  const rand = (a, b) => a + Math.random() * (b - a);

  class ChaseScene extends Phaser.Scene {
    constructor() { super('Chase'); }

    create() {
      ME.sfx.bgmStart('chase');
      this.events.once('shutdown', () => { ME.sfx.bgmStop(); ME.sfx.pullOff(); });
      this.makeBackground();
      this.bg = this.add.image(0, 0, 'chase-bg').setOrigin(0);
      this.hills = [['ch-hill1', 0.05], ['ch-hill2', 0.12], ['ch-hill3', 0.22]].map(([k, par]) => ({ s: this.add.tileSprite(0, 0, W, H, k).setOrigin(0), par }));
      this.dust = Array.from({ length: 40 }, (_, i) => ({ x: Math.random() * W, y: Math.random() * 400, v: 10 + Math.random() * 30, ph: Math.random() * 6, z: Math.random() }));
      this.gFar = this.add.graphics();
      this.gWorld = this.add.graphics();
      this.knightG = this.add.graphics();
      this.playerG = this.add.graphics();
      this.gFx = this.add.graphics();
      this.gHud = this.add.graphics().setScrollFactor(0);
      this.gCursor = this.add.graphics().setDepth(50);

      const font = { fontFamily: '"Malgun Gothic","Apple SD Gothic Neo",sans-serif' };
      this.txtGap = this.add.text(30, 26, '망자와의 거리', { ...font, fontSize: '13px', color: '#e3eaf2' });
      this.txtFrag = this.add.text(W - 178, 31, '주마등', { ...font, fontSize: '13px', color: '#e3eaf2' });
      this.txtMark = this.add.text(0, 0, '', { ...font, fontSize: '30px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
      this.txtRevealT = this.add.text(W / 2, 54, '', { ...font, fontSize: '17px', fontStyle: 'bold', color: '#5a3a20' }).setOrigin(0.5);
      this.txtRevealS = this.add.text(W / 2, 80, '', { ...font, fontSize: '14px', color: '#5a3a20' }).setOrigin(0.5);
      this.txtHint = this.add.text(W / 2, H - 52, '', { ...font, fontSize: '15px', fontStyle: 'bold', color: '#bff3ff' }).setOrigin(0.5);
      this.txtCenter = this.add.text(W / 2, 150, '', { ...font, fontSize: '22px', fontStyle: 'bold', color: '#fff8e6' }).setOrigin(0.5);
      this.txtMash = this.add.text(0, 0, '연타!', { ...font, fontSize: '14px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
      this.txtOverlayT = this.add.text(W / 2, H / 2 - 70, '', { ...font, fontSize: '28px', fontStyle: 'bold', color: '#f2f5f8' }).setOrigin(0.5).setDepth(20);
      this.txtOverlayS = this.add.text(W / 2, H / 2 - 30, '', { ...font, fontSize: '15px', color: '#c4cfdb', align: 'center', lineSpacing: 6 }).setOrigin(0.5, 0).setDepth(20);
      this.gOverlay = this.add.graphics().setDepth(19);
      this.pops = [];
      this.font = font;

      // 입력
      this.mouse = { x: W / 2, y: H / 2, down: false, clicked: false };
      this.input.on('pointermove', p => { this.mouse.x = p.x; this.mouse.y = p.y; });
      this.input.on('pointerdown', p => { this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.down = true; this.mouse.clicked = true; });
      this.input.on('pointerup', () => { this.mouse.down = false; });
      this.input.on('gameout', () => { this.mouse.down = false; });
      this.keys = this.input.keyboard.addKeys('SPACE,W,UP');
      this.input.setDefaultCursor('none');

      this.resetState();
      this.mode = 'intro';
      this.showOverlay('망자의 세계', '스페이스 = 점프 · 링이 겹치는 순간 클릭 = 포착\n연타 = 흡수 · 망자를 조준해 클릭 = 발사\n\n클릭해서 추격 시작');
      ME.applyLook(this);
      this.cameras.main.fadeIn(600, 255, 255, 255);
    }

    // ---------- 상태 ----------
    resetState() {
      this.t = 0; this.scroll = 0;
      this.player = { x: 220, y: GROUND, vy: 0, onGround: true, stun: 0 };
      this.gap = C.gapStart; this.kx = 280 + C.gapStart * 6;
      this.orb = { state: 'wait', timer: 1.2 };
      this.frags = 0; this.reveal = null;
      this.shots = []; this.waves = []; this.parts = [];
      this.stagger = 0; this.hitstop = 0; this.slow = 0;
      this.kd = { phase: 'idle', t: 2, type: 'hop', dur: 0.5, mark: '!' };
      this.pits = []; this.pitTimer = 4; this.debris = []; this.debrisTimer = 4;
      this.finale = null;
    }
    retryKeepFrags() {
      this.gap = C.gapStart; this.kx = 280 + C.gapStart * 6;
      this.shots = []; this.pits = []; this.debris = [];
      this.orb = { state: 'wait', timer: 1.2 };
      this.player.stun = 0;
    }

    showOverlay(title, sub) {
      this.gOverlay.clear().fillStyle(0x0e1218, 0.72).fillRect(0, 0, W, H);
      this.txtOverlayT.setText(title); this.txtOverlayS.setText(sub);
    }
    hideOverlay() { this.gOverlay.clear(); this.txtOverlayT.setText(''); this.txtOverlayS.setText(''); }

    // ---------- 계산 헬퍼 ----------
    gunPos() { return { x: this.player.x + 24, y: this.player.y - 36 }; }
    dodgeP() { return this.kd.phase === 'dodge' ? 1 - this.kd.t / this.kd.dur : 0; }
    knightTargetX() {
      const dash = this.kd.phase === 'dodge' && this.kd.type === 'dash' ? Math.sin(Math.PI * this.dodgeP()) * 120 : 0;
      return 280 + this.gap * 6 + dash;
    }
    knightX() { return this.kx - (this.stagger > 0 ? Math.sin(this.t * 40) * 4 : 0); }
    knightLift() {
      if (this.kd.phase !== 'dodge') return 0;
      const p = this.dodgeP();
      if (this.kd.type === 'hop') return Math.sin(Math.PI * p) * 95;
      if (this.kd.type === 'double') return Math.abs(Math.sin(2 * Math.PI * p)) * 80;
      return 0;
    }
    knightY() { return GROUND - this.knightLift(); }
    shake(d, i) { this.cameras.main.shake(d * 1000, i, true); }

    burst(x, y, n, color) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = rand(120, 440);
        this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.35, 0.65), color });
      }
    }
    pop(x, y, text) {
      const t = this.add.text(x, y, text, { ...this.font, fontSize: '22px', fontStyle: 'bold', color: '#bff3ff' }).setOrigin(0.5);
      this.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: 350, onComplete: () => t.destroy() });
    }
    emitWave(tx, ty) {
      const g = this.gunPos();
      this.waves.push({ x: g.x, y: g.y, ang: Math.atan2(ty - g.y, tx - g.x), r: 10, life: 0.45 });
    }

    // ---------- 주마등 오브젝트 ----------
    spawnOrb() {
      this.orb = { state: 'offer', x: rand(640, 800), y: rand(110, 280), vx: -40, ph: rand(0, 6), life: C.captureRing };
      this.orb.baseY = this.orb.y;
    }
    loseOrb() { this.orb.state = 'fade'; this.orb.timer = 0.4; }
    updateOrb(dt) {
      const o = this.orb, m = this.mouse;
      if (this.frags >= C.fragMax) { o.state = 'none'; return; }
      if (o.state === 'wait') {
        o.timer -= dt; if (o.timer <= 0) this.spawnOrb();
      } else if (o.state === 'offer') {
        o.life -= dt; o.ph += dt; o.x += o.vx * dt; o.y = o.baseY + Math.sin(o.ph * 2) * 10;
        if (m.clicked) {
          this.emitWave(m.x, m.y);
          const onIt = Math.hypot(m.x - o.x, m.y - o.y) < C.captureRadius;
          if (onIt && Math.abs(o.life) <= C.judge) {
            Object.assign(o, { state: 'absorb', prog: 0, hits: 0, mashT: C.mashTime, kick: 0, sx: o.x, sy: o.y, ph: 0 });
            this.hitstop = 0.06; this.burst(o.x, o.y, 14, 0x78e6ff); ME.sfx.play('catch');
          } else if (onIt) { this.loseOrb(); ME.sfx.play('miss'); }
          else ME.sfx.play('zap');
        }
        if (o.state === 'offer' && o.life < -C.judge) this.loseOrb();
      } else if (o.state === 'absorb') {
        o.ph += dt; o.mashT -= dt;
        const g = this.gunPos(), k = o.prog * 0.8;
        o.x = o.sx + (g.x + 60 - o.sx) * k + Math.sin(o.ph * 3.1) * 18 * (1 - k);
        o.y = o.sy + (g.y - 40 - o.sy) * k + Math.cos(o.ph * 2.4) * 20 * (1 - k);
        if (m.clicked) {
          o.hits++; o.prog = o.hits / C.mashNeed; o.kick = 1; ME.sfx.play('mash', o.hits);
          this.shake(0.06, 0.004); this.hitstop = Math.max(this.hitstop, 0.025);
          this.burst(o.x, o.y, 6, Math.random() < 0.5 ? 0x78e6ff : 0xffebbe);
          this.waves.push({ x: g.x, y: g.y, ang: Math.atan2(o.y - g.y, o.x - g.x), r: 14, life: 0.3 });
          this.pop(o.x + rand(-20, 20), o.y - 36, String(o.hits));
        }
        if (o.kick > 0) o.kick = Math.max(0, o.kick - dt * 8);
        if (o.prog >= 1) {
          o.state = 'charged'; o.lock = C.fireLock; ME.sfx.play('charge');
          this.shake(0.2, 0.008); this.hitstop = 0.09;
          this.burst(g.x + 4, g.y, 26, 0xfff0c8);
        } else if (o.mashT <= 0) { this.loseOrb(); ME.sfx.play('miss'); }
      } else if (o.state === 'charged') {
        if (o.lock > 0) o.lock -= dt;
        if (m.clicked && o.lock <= 0) {
          const g = this.gunPos(), a = Math.atan2(m.y - g.y, m.x - g.x);
          this.shots.push({ x: g.x, y: g.y, vx: Math.cos(a) * C.shotSpeed, vy: Math.sin(a) * C.shotSpeed, life: C.shotLife });
          o.state = 'flying'; ME.sfx.play('fire');
        }
      } else if (o.state === 'fade') {
        o.timer -= dt; if (o.timer <= 0) { o.state = 'wait'; o.timer = C.respawn; }
      }
    }
    updateShots(dt) {
      for (const sh of this.shots) {
        sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.life -= dt;
        const kx = this.knightX(), ky = this.knightY() - 60;
        if (!sh.done && !sh.dodged && this.kd.phase === 'dodge' && Math.abs(sh.x - kx) < 60) sh.dodged = true;
        if (!sh.done && !sh.dodged && Math.abs(sh.x - kx) < 50 && Math.abs(sh.y - ky) < 60) {
          sh.done = true; this.frags++; this.stagger = C.staggerTime;
          this.reveal = { n: this.frags, t: 2.6 };   // 주마등은 망자가 맞은 순간 공개 (11/22 피드백)
          this.shake(0.25, 0.01); this.hitstop = 0.1; this.burst(kx, ky, 30, 0x78e6ff); ME.sfx.play('hit');
          for (let i = 0; i < 3; i++) this.waves.push({ x: kx, y: ky, ang: 0, r: 10 + i * 14, life: 0.5, full: true });
          this.orb = { state: 'wait', timer: C.respawnAfterHit };
        }
        if (!sh.done && (sh.life <= 0 || sh.x > W + 40 || sh.x < -40 || sh.y < -40 || sh.y > H + 40)) {
          sh.done = true; this.orb = { state: 'wait', timer: C.respawn };
        }
      }
      this.shots = this.shots.filter(s => !s.done);
      this.waves.forEach(w => { w.r += 420 * dt; w.life -= dt; });
      this.waves = this.waves.filter(w => w.life > 0);
      this.parts.forEach(q => { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.9; q.vy *= 0.9; q.life -= dt; });
      this.parts = this.parts.filter(q => q.life > 0);
    }

    // ---------- 기믹 ----------
    hurt(mult) {
      const p = this.player;
      p.stun = C.stunTime; this.gap += C.trapPush * mult;
      this.shake(0.15, 0.006); this.cameras.main.flash(120, 255, 255, 255); ME.sfx.play('hurt');
    }
    updateGimmicks(dt, speed) {
      const p = this.player, active = this.frags < C.fragMax, kd = this.kd;
      // 망자 회피
      if (active) {
        kd.t -= dt;
        if (kd.t <= 0) {
          if (kd.phase === 'idle') {
            let r = Math.random(), pick = C.dodgePatterns[0];
            for (const pt of C.dodgePatterns) { if (r < pt.weight) { pick = pt; break; } r -= pt.weight; }
            Object.assign(kd, { phase: 'tell', t: C.dodgeTell, type: pick.type, mark: pick.mark, dur: pick.dur });
          } else if (kd.phase === 'tell') { kd.phase = 'dodge'; kd.t = kd.dur; }
          else { kd.phase = 'idle'; kd.t = C.dodgeCooldown * rand(0.6, 1.4); }
        }
      } else { kd.phase = 'idle'; }
      // 붕괴 지형
      if (active) {
        this.pitTimer -= dt;
        if (this.pitTimer <= 0) { this.pits.push({ x: W + 40, w: rand(...C.pitWidth), open: false }); this.pitTimer = rand(...C.pitInterval); }
      }
      this.pits.forEach(pt => { pt.x -= speed * dt; if (!pt.open && pt.x < C.pitOpenX) pt.open = true; });
      this.pits = this.pits.filter(pt => pt.x + pt.w > -20);
      for (const pt of this.pits) {
        if (pt.open && !pt.hit && p.stun <= 0 && p.onGround && p.x > pt.x + 6 && p.x < pt.x + pt.w - 6) {
          pt.hit = true; this.hurt(1.2); p.vy = -500; p.onGround = false;
        }
      }
      // 망자의 잔해
      if (active) {
        this.debrisTimer -= dt;
        if (this.debrisTimer <= 0) {
          this.debris.push({ x: this.knightX() - 30, y: GROUND - 18, vx: -(speed + 260), r: 12, warn: C.debrisWarn });
          this.debrisTimer = rand(...C.debrisInterval);
        }
      }
      this.debris.forEach(d => { if (d.warn > 0) d.warn -= dt; else d.x += d.vx * dt; });
      this.debris = this.debris.filter(d => d.x > -30);
      for (const d of this.debris) {
        if (!d.hit && d.warn <= 0 && p.stun <= 0 && Math.abs(d.x - p.x) < d.r + 12 && p.y > GROUND - 30) { d.hit = true; this.hurt(0.8); }
      }
    }

    // ---------- 메인 루프 ----------
    update(time, deltaMs) {
      let dt = Math.min(0.05, deltaMs / 1000);
      const m = this.mouse;
      const jump = Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.W) || Phaser.Input.Keyboard.JustDown(this.keys.UP);

      if (this.mode !== 'play') {
        if (m.clicked) {
          if (this.mode === 'intro') { this.hideOverlay(); this.mode = 'play'; }
          else if (this.mode === 'fail') { this.hideOverlay(); this.retryKeepFrags(); this.mode = 'play'; }
        }
        m.clicked = false;
        this.draw();
        return;
      }
      if (this.slow > 0) { this.slow -= dt; dt *= 0.3; }
      if (this.hitstop > 0) { this.hitstop -= Math.min(0.05, deltaMs / 1000); dt = 0; }
      this.step(dt, jump);
      m.clicked = false;
      this.draw();
    }

    step(dt, jump) {
      this.t += dt;
      const p = this.player;
      const speed = C.runSpeed * (p.stun > 0 ? 0.5 : 1);
      this.scroll += speed * dt;

      if (jump && p.onGround && dt > 0) { p.vy = -C.jumpVelocity; p.onGround = false; ME.sfx.play('jump'); }
      p.vy += C.gravity * dt; p.y += p.vy * dt;
      if (p.y >= GROUND) { p.y = GROUND; p.vy = 0; p.onGround = true; }
      if (p.stun > 0) p.stun -= dt;

      if (this.frags >= C.fragMax) this.updateFinale(dt);
      else {
        if (this.stagger > 0) this.stagger -= dt;
        if (p.stun <= 0) this.gap = Math.max(C.gapMin, this.gap - C.recover * dt);
        if (this.gap >= C.gapFail) {
          this.mode = 'fail';
          this.showOverlay('망자를 놓쳤다', '모은 주마등은 유지됩니다\n클릭해서 다시 추격');
        }
      }
      this.kx += (this.knightTargetX() - this.kx) * Math.min(1, dt * 5);
      this.updateGimmicks(dt, speed);
      this.updateOrb(dt);
      this.updateShots(dt);
      if (this.reveal) { this.reveal.t -= dt; if (this.reveal.t <= 0) this.reveal = null; }
    }

    updateFinale(dt) {
      if (!this.finale) {
        this.finale = { t: 0, pull: false, done: 0 };
        this.slow = C.finaleSlow; this.shake(0.4, 0.012); this.cameras.main.flash(400, 255, 255, 255); ME.sfx.bgmStop(); ME.sfx.play('finale');
      }
      const F = this.finale, m = this.mouse;
      F.t += dt;
      const kx = this.knightX(), ky = this.knightY() - 60;
      F.pull = F.t > 0.5 && m.down && Math.abs(m.x - kx) < 70 && Math.abs(m.y - ky) < 80;
      if (F.done > 0) {
        F.done += dt;
        if (F.done > 1.4 && !F.leaving) {
          F.leaving = true; ME.sfx.pullOff();
          this.cameras.main.fadeOut(900, 255, 255, 255);
          this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Funeral'));
        }
      } else if (F.pull) {
        this.gap = Math.max(0, this.gap - C.pullSpeed * dt); ME.sfx.pullOn(1 - Math.min(1, this.gap / C.pullBackMax));
        if (Math.random() < dt * 25) this.burst(kx + rand(-20, 20), ky + rand(-25, 25), 2, 0x78e6ff);
        if (this.gap <= 0.5) { F.done = 0.001; this.shake(0.35, 0.012); this.hitstop = 0.12; this.burst(kx, ky, 40, 0xfff0c8); ME.sfx.pullOff(); ME.sfx.play('hit'); }
      } else if (F.t > 0.5) {
        ME.sfx.pullOff();
        this.gap = Math.min(C.pullBackMax, this.gap + C.pullBack * dt);
      }
    }

    // ---------- 그리기 ----------
    makeBackground() {
      if (!this.textures.exists('chase-bg')) {
        const tex = this.textures.createCanvas('chase-bg', W, H), c = tex.getContext();
        ME.bandSky(c, 0, 0, W, 360, [[0, '#3b2a4a'], [0.35, '#a8506a'], [0.65, '#f08a5a'], [1, '#ffd38a']], 14);
        // 해: 동심원 띠
        [[120, 'rgba(255,214,150,0.18)'], [96, 'rgba(255,224,170,0.28)'], [74, 'rgba(255,236,196,0.55)'], [58, '#fff0cf']].forEach(([r, col]) => {
          c.fillStyle = col; c.beginPath(); c.arc(700, 250, r, 0, Math.PI * 2); c.fill();
        });
        // 가로로 지나가는 구름 띠
        c.fillStyle = 'rgba(90,40,70,0.55)';
        [[80, 230, 520, 6], [430, 210, 360, 4], [610, 268, 300, 6], [150, 120, 280, 4], [520, 96, 380, 6]].forEach(([x, y, w, h]) => {
          c.fillRect(x, y, w, h); c.fillRect(x + 30, y - 4, w * 0.5, 4);
        });
        c.fillStyle = 'rgba(255,220,180,0.35)';
        [[100, 236, 460, 2], [640, 274, 240, 2], [540, 102, 300, 2]].forEach(([x, y, w, h]) => c.fillRect(x, y, w, h));
        c.fillStyle = '#ffd38a'; c.fillRect(0, 360, W, H - 360);
        tex.refresh();
      }
      // 반복되는 능선 3겹 (가로로 이어지게 주기를 폭에 맞춤)
      const layer = (key, w, baseY, amp, k, seed, color, jag) => {
        if (this.textures.exists(key)) return;
        const t = this.textures.createCanvas(key, w, H), c = t.getContext();
        c.fillStyle = color; c.beginPath(); c.moveTo(0, H);
        for (let x = 0; x <= w; x += 4) {
          const f = Math.PI * 2 * x / w;
          const y = baseY - amp * (0.55 + 0.3 * Math.sin(f * k + seed) + 0.15 * Math.sin(f * k * 3 + seed * 2))
            - (jag ? ME.hash(Math.floor(x / 8) % (w / 8) + seed) * jag : 0);
          c.lineTo(x, Math.round(y / 2) * 2);
        }
        c.lineTo(w, H); c.closePath(); c.fill();
        t.refresh();
      };
      layer('ch-hill1', 1920, 330, 120, 3, 1.3, '#b8607a', 0);
      layer('ch-hill2', 1920, 370, 90, 5, 4.1, '#7a3a5a', 6);
      layer('ch-hill3', 1920, 405, 60, 7, 2.2, '#4a2038', 10);
    }
    drawReeds(g, par, baseY, step, color, alpha, hMax) {
      const off = (this.scroll * par) % step;
      const base = Math.floor(this.scroll * par / step) * step;
      g.lineStyle(2, color, alpha); g.fillStyle(color, alpha);
      for (let x = -step; x < W + step; x += step) {
        const xx = x - off, seed = Math.sin((x + base) * 12.9898) * 43758.5453;
        const h = hMax * (0.55 + (seed - Math.floor(seed)) * 0.45);
        const sway = Math.sin(this.t * 1.6 + x * 0.05) * 6;
        g.beginPath(); g.moveTo(xx, baseY); g.lineTo(xx + sway * 0.5, baseY - h * 0.5); g.lineTo(xx + sway, baseY - h); g.strokePath();
        g.fillEllipse(xx + sway, baseY - h - 6, 6, 18);
        if (alpha > 0.95) { g.fillStyle(0xff9a6a, 0.5).fillRect(xx + sway + 1, baseY - h - 12, 2, 8); g.fillStyle(color, alpha); }
      }
    }
    draw() {
      const g = this.gWorld, fx = this.gFx, far = this.gFar;
      far.clear(); g.clear(); fx.clear();
      for (const h of this.hills) h.s.tilePositionX = this.scroll * h.par;
      this.drawReeds(far, 0.3, 412, 22, 0x5a2440, 0.9, 50);
      this.drawReeds(far, 0.6, GROUND + 6, 14, 0x3a1428, 1, 92);
      // 땅: 짙은 흙 + 위쪽 노을 반사 + 흙 무늬
      g.fillStyle(0x2a0f1e, 1).fillRect(0, GROUND, W, H - GROUND);
      g.fillStyle(0xff9a6a, 0.55).fillRect(0, GROUND, W, 2);
      g.fillStyle(0x4a1c30, 1);
      { const off = this.scroll % 64;
        for (let x = -64; x < W + 64; x += 64) for (let r = 0; r < 4; r++) {
          const hx = ME.hash(Math.floor((x + this.scroll - off) / 64) * 7 + r);
          g.fillRect(Math.round(x - off + hx * 50), GROUND + 12 + r * 22, 10 + hx * 18, 2);
        } }
      // 떠다니는 먼지(빛 알갱이)
      for (const d of this.dust) {
        const dx = ((d.x - this.scroll * (0.2 + d.z * 0.5) - this.t * d.v) % W + W) % W;
        const dy = d.y + Math.sin(this.t + d.ph) * 8;
        far.fillStyle(0xffe6b0, 0.25 + d.z * 0.45).fillRect(Math.round(dx), Math.round(dy), d.z > 0.6 ? 3 : 2, d.z > 0.6 ? 3 : 2);
      }
      for (const pt of this.pits) {
        if (pt.open) {
          g.fillStyle(COL.pit, 1).fillRect(pt.x, GROUND, pt.w, H - GROUND);
          g.fillStyle(0xffe6b4, 0.25).fillRect(pt.x, GROUND, 3, H - GROUND).fillRect(pt.x + pt.w - 3, GROUND, 3, H - GROUND);
        } else {
          g.lineStyle(2, 0x3c1e0a, 0.9);
          for (let i = 0; i < 4; i++) {
            const x0 = pt.x + pt.w * (i / 4);
            g.beginPath(); g.moveTo(x0, GROUND + 1); g.lineTo(x0 + 10, GROUND + 14); g.lineTo(x0 + 4, GROUND + 28); g.strokePath();
          }
        }
      }
      // 잔해
      for (const d of this.debris) {
        const a = this.t * 8, pts = [];
        for (let i = 0; i < 4; i++) { const ang = a + i * Math.PI / 2, rr = i % 2 ? d.r * 0.8 : d.r; pts.push({ x: d.x + Math.cos(ang) * rr, y: d.y + Math.sin(ang) * rr }); }
        g.fillStyle(d.warn > 0 ? 0xffffff : COL.memory, 1).fillPoints(pts, true);
        g.lineStyle(2, 0x8a5a2b, 1).strokePoints(pts, true);
      }
      this.drawKnight();
      this.drawPlayer();
      this.drawOrb(fx);
      this.drawWaves(fx);
      for (const q of this.parts) fx.fillStyle(q.color, Math.min(1, q.life * 2.5)).fillRect(q.x - 2, q.y - 2, 4, 4);
      this.drawHud();
    }
    drawKnight() {
      const kg = this.knightG; kg.clear();
      const x = this.knightX(), y = this.knightY(), F = this.finale;
      kg.setPosition(x, y + (F ? 0 : Math.sin(this.t * 12) * 3));
      let rot = 0, alpha = 1;
      if (F) { rot = F.pull ? Math.sin(this.t * 30) * 0.08 - 0.2 : -0.1; if (F.done > 0) alpha = Math.max(0.2, 1 - F.done); }
      else if (this.kd.phase === 'tell') rot = this.kd.type === 'dash' ? 0.12 : -0.18;
      if (this.kd.phase === 'dodge') alpha = 0.75;
      kg.setRotation(rot).setAlpha(alpha);
      const leg = F ? (F.pull ? Math.sin(this.t * 26) * 9 : Math.sin(this.t * 10) * 5) : Math.sin(this.t * 14) * 8;
      ME.drawKnight(kg, 0, 0, 1, { leg });  // 장례와 같은 갑옷 모습 (src/knight.js)
      this.txtMark.setText(this.kd.phase === 'tell' && !F ? this.kd.mark : '').setPosition(x, y - 128);
    }
    drawPlayer() {
      const p = this.player, pg = this.playerG; pg.clear();
      pg.setPosition(p.x, p.y).setAlpha(p.stun > 0 && Math.floor(p.stun * 20) % 2 === 0 ? 0.45 : 1);
      ME.drawUndertaker(pg, 0, 0, { run: p.onGround ? Math.sin(this.t * 16) : 0.6 });
    }
    drawOrb(fx) {
      const o = this.orb;
      this.txtMash.setText('');
      if (!['offer', 'absorb', 'fade', 'charged'].includes(o.state)) return;
      const gp = this.gunPos();
      let x = o.x, y = o.y, rad = 40, a = 1;
      if (o.state === 'fade') a = Math.max(0, o.timer / 0.4);
      if (o.state === 'absorb') rad = 40 - 22 * o.prog + o.kick * 10;
      if (o.state === 'charged') { x = gp.x + 4; y = gp.y; rad = 14 + Math.sin(this.t * 10) * 2; }
      fx.fillStyle(COL.memoryGlow, 0.25 * a).fillCircle(x, y, rad);
      fx.fillStyle(0xffe6aa, 0.55 * a).fillCircle(x, y, rad * 0.55);
      fx.fillStyle(0xfffff0, a).fillCircle(x, y, rad * 0.25);
      if (o.state === 'offer') {
        const r = 24 + 66 * Math.max(0, o.life / C.captureRing), near = Math.abs(o.life) <= C.judge;
        fx.lineStyle(near ? 4 : 2.5, near ? 0x78e6ff : 0xffffff, near ? 1 : 0.9).strokeCircle(x, y, r);
        fx.lineStyle(2, 0xffffff, 0.75).strokeCircle(x, y, 24);
      }
      if (o.state === 'absorb') {
        fx.lineStyle(5, 0x78e6ff, 0.95).beginPath().arc(x, y, 32, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * o.prog).strokePath();
        const tr = Math.max(0, o.mashT / C.mashTime);
        fx.lineStyle(2, tr < 0.3 ? 0xe76f51 : 0xffffff, tr < 0.3 ? 0.9 : 0.6).beginPath().arc(x, y, 42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * tr).strokePath();
        this.txtMash.setText('연타!').setPosition(x, y + 62);
      }
    }
    drawTether(fx, tx, ty, amp, alpha) {
      const g = this.gunPos(), dx = tx - g.x, dy = ty - g.y, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
      const c = Math.cos(ang), s = Math.sin(ang);
      for (let k = 0; k < 2; k++) {
        fx.lineStyle(k ? 8 : 2.5, k ? 0x78e6ff : 0xaaf0ff, k ? 0.35 * alpha : 0.95 * alpha).beginPath();
        for (let i = 0; i <= len; i += 4) {
          const yy = Math.sin(i * 0.1 + this.t * 22) * amp * Math.sin(Math.PI * i / len);
          const px = g.x + c * i - s * yy, py = g.y + s * i + c * yy;
          i === 0 ? fx.moveTo(px, py) : fx.lineTo(px, py);
        }
        fx.strokePath();
      }
    }
    drawWaves(fx) {
      const o = this.orb;
      if (o.state === 'absorb') this.drawTether(fx, o.x, o.y, 7, 1);
      if (this.finale && this.finale.pull && !this.finale.done) this.drawTether(fx, this.knightX(), this.knightY() - 60, 10, 1);
      for (const w of this.waves) {
        fx.lineStyle(2.5, 0x78e6ff, Math.max(0, w.life / 0.45)).beginPath();
        if (w.full) fx.arc(w.x, w.y, w.r, 0, Math.PI * 2); else fx.arc(w.x, w.y, w.r, w.ang - 0.45, w.ang + 0.45);
        fx.strokePath();
      }
      for (const sh of this.shots) {
        const a = Math.atan2(sh.vy, sh.vx);
        for (let i = 0; i < 3; i++) {
          const cx = sh.x - Math.cos(a) * i * 12, cy = sh.y - Math.sin(a) * i * 12;
          fx.lineStyle(3, 0x96ebff, 0.9 - i * 0.25).beginPath().arc(cx, cy, 14 + i * 4, a - 0.7, a + 0.7).strokePath();
        }
        fx.fillStyle(0xfff5d7, 0.95).fillCircle(sh.x + Math.cos(a) * 4, sh.y + Math.sin(a) * 4, 6);
      }
    }
    drawHud() {
      const h = this.gHud; h.clear();
      // 주마등 노출 (망자가 맞은 순간부터 2.6초)
      let alpha = 0, n = 0;
      if (this.reveal) { alpha = Math.min(1, this.reveal.t / 0.8); n = this.reveal.n; }
      if (alpha > 0.01) {
        h.fillStyle(0xfff8e6, 0.82 * alpha).fillRect(250, 30, 460, 70);
        this.txtRevealT.setText('주마등 ' + n + ' / ' + C.fragMax).setAlpha(alpha);
        this.txtRevealS.setText(ME.FRAGMENTS[n - 1] || '').setAlpha(alpha);
      } else { this.txtRevealT.setText(''); this.txtRevealS.setText(''); }
      // 거리
      h.fillStyle(0x141820, 0.55).fillRect(20, 20, 200, 52);
      h.fillStyle(0x3a4352, 1).fillRect(30, 46, 180, 12);
      const gr = Math.min(100, this.gap) / 100;
      h.fillStyle(gr > 0.8 ? 0xe76f51 : 0xf4d58d, 1).fillRect(30, 46, 180 * gr, 12);
      // 조각
      h.fillStyle(0x141820, 0.55).fillRect(W - 190, 20, 170, 40);
      for (let i = 0; i < C.fragMax; i++) h.fillStyle(i < this.frags ? COL.memory : 0xffffff, i < this.frags ? 1 : 0.18).fillCircle(W - 120 + i * 20, 40, 6);
      // 충전 안내
      if (this.orb.state === 'charged') {
        h.fillStyle(0x141820, 0.6).fillRect(W / 2 - 160, H - 70, 320, 34);
        this.txtHint.setText('기억 흡수 완료 — 망자를 조준해 발사');
      } else this.txtHint.setText('');
      // 마지막 붙잡기
      const F = this.finale;
      this.txtCenter.setText('');
      if (F) {
        h.fillStyle(0x28140a, Math.min(0.35, F.t * 0.2)).fillRect(0, 0, W, H);
        if (F.t > 0.5) {
          this.txtCenter.setAlpha(Math.min(1, (F.t - 0.5) * 1.5));
          this.txtCenter.setText(F.done > 0 ? '망자를 붙잡았다' : (F.pull ? '끌어당기는 중 — 놓지 마세요' : '망자에 조준을 올리고 마우스를 누르고 있으세요'));
          if (!F.done) {
            const kx = this.knightX(), ky = this.knightY() - 60;
            h.lineStyle(2, F.pull ? 0x78e6ff : 0xffffff, F.pull ? 0.9 : 0.5 + Math.sin(this.t * 6) * 0.3).strokeRect(kx - 70, ky - 80, 140, 160);
          }
        }
      }
      // 커서
      const m = this.mouse, on = this.orb.state === 'absorb' || this.orb.state === 'charged' || (F && F.pull);
      const cg = this.gCursor; cg.clear();
      const cc = this.mode !== 'play' ? 0xe6edf5 : (on ? 0xbff3ff : 0x1e1e28);
      cg.lineStyle(1.5, cc, on || this.mode !== 'play' ? 1 : 0.8).strokeCircle(m.x, m.y, 9);
      cg.beginPath().moveTo(m.x - 14, m.y).lineTo(m.x - 5, m.y).moveTo(m.x + 5, m.y).lineTo(m.x + 14, m.y)
        .moveTo(m.x, m.y - 14).lineTo(m.x, m.y - 5).moveTo(m.x, m.y + 5).lineTo(m.x, m.y + 14).strokePath();
    }
  }
  ME.ChaseScene = ChaseScene;
})();
