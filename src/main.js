// 메모리 엔더 — 씬 구성 (개발 빌드)
// Title → Investigate(추리) → Chase(추격) → Funeral(장례)
(function () {
  const { W, H } = ME;
  const font = { fontFamily: '"Malgun Gothic","Apple SD Gothic Neo",sans-serif' };

  class TitleScene extends Phaser.Scene {
    constructor() { super('Title'); }
    create() {
      this.cameras.main.setBackgroundColor('#1a2230');
      this.leaving = false;
      // 배경: 추격과 같은 노을 갈대밭, 멀리 망자와 장의사
      ME.ChaseScene.prototype.makeBackground.call(this);
      this.add.image(0, 0, 'chase-bg').setOrigin(0);
      this.hillT = ['ch-hill1', 'ch-hill2', 'ch-hill3'].map(k => this.add.tileSprite(0, 0, W, H, k).setOrigin(0));
      this.g = this.add.graphics(); this.t = 0;
      this.add.rectangle(W / 2, H / 2 + 50, W, 230, 0x140a14, 0.35);
      this.input.setDefaultCursor('default');   // 추격·추리에서 숨긴 커서를 되돌림
      this.add.text(W / 2, H / 2 - 40, '메모리 엔더', { ...font, fontSize: '40px', fontStyle: 'bold', color: '#fff0cf' }).setOrigin(0.5);
      this.add.text(W / 2, H - 46, 'M = 소리 켜기 / 끄기', { ...font, fontSize: '11px', color: '#9a7a8a' }).setOrigin(0.5);
      this.add.text(W / 2, H / 2 + 6, 'Memory Ender', { ...font, fontSize: '16px', color: '#f0c0a0' }).setOrigin(0.5);
      const go = (key) => {
        if (this.leaving) return; this.leaving = true;
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key));
      };
      // 처음부터 시작
      const start = this.add.text(W / 2, H / 2 + 70, '처음부터 시작', { ...font, fontSize: '16px', color: '#e6edf5', backgroundColor: '#5a2440', padding: { x: 16, y: 7 } })
        .setOrigin(0.5).setInteractive({ useHandCursor: true });
      start.on('pointerdown', () => { ME.sfx.unlock(); ME.sfx.play('ui'); go('Investigate'); });
      if (ME.DEV) this.add.text(W / 2, H / 2 + 34, '(개발 빌드)', { ...font, fontSize: '11px', color: '#56677a' }).setOrigin(0.5);
      // 챕터 선택 — 배포 빌드에서도 표시 (면접관이 원하는 구간을 바로 볼 수 있게, 11/23)
      {
      this.add.text(W / 2, H / 2 + 122, '챕터 선택', { ...font, fontSize: '12px', color: '#f0c0a0' }).setOrigin(0.5);
      [['1. 추리', 'Investigate'], ['2. 추격', 'Chase'], ['3. 장례', 'Funeral']].forEach(([label, key], i) => {
        const b = this.add.text(W / 2 + (i - 1) * 110, H / 2 + 152, label, { ...font, fontSize: '14px', color: '#f0d8c8', backgroundColor: '#3a1428', padding: { x: 12, y: 5 } })
          .setOrigin(0.5).setInteractive({ useHandCursor: true });
        b.on('pointerover', () => b.setColor('#ffffff')).on('pointerout', () => b.setColor('#f0d8c8'));
        b.on('pointerdown', () => { ME.sfx.unlock(); ME.sfx.play('ui'); go(key); });
      });
      this.add.text(W / 2, H - 24, '플레이 중 Esc = 타이틀로', { ...font, fontSize: '11px', color: '#9a7a8a' }).setOrigin(0.5);
      }
      ME.applyLook(this);
      this.cameras.main.fadeIn(600, 0, 0, 0);
    }
    update(time, dms) {
      const dt = dms / 1000; this.t += dt;
      this.hillT.forEach((h, i) => { h.tilePositionX = this.t * (6 + i * 10); });
      const g = this.g; g.clear();
      g.fillStyle(0x2a0f1e, 1).fillRect(0, ME.GROUND, W, H - ME.GROUND);
      g.fillStyle(0xff9a6a, 0.55).fillRect(0, ME.GROUND, W, 2);
      for (let x = 0; x < W; x += 12) {
        const h = 50 + ME.hash(x) * 50, sw = Math.sin(this.t * 1.6 + x * 0.05) * 6;
        g.lineStyle(2, 0x3a1428, 1).lineBetween(x, ME.GROUND, x + sw, ME.GROUND - h);
        g.fillStyle(0x3a1428, 1).fillEllipse(x + sw, ME.GROUND - h - 6, 6, 16);
      }
      ME.drawKnight(g, 800, ME.GROUND, 1.1, { leg: Math.sin(this.t * 3) * 3 });
      ME.drawUndertaker(g, 150, ME.GROUND, {});
    }
  }

  // 어느 장면에서든 Esc를 누르면 타이틀로 (챕터 선택과 함께 배포 빌드에도 유지)
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !window.__meGame) return;
    const g = window.__meGame;
    ME.sfx.bgmStop(); ME.sfx.humOff();
    g.scene.getScenes(true).forEach(sc => { if (sc.scene.key !== 'Title') sc.scene.stop(); });
    g.scene.start('Title');
  });

  window.__meGame = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W, height: H,
    backgroundColor: '#12161d',
    pixelArt: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [TitleScene, ME.InvestigateScene, ME.ChaseScene, ME.FuneralScene],
  });
})();
