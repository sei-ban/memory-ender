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
      this.input.setDefaultCursor('default');   // 추격·추리에서 숨긴 커서를 되돌림
      this.add.text(W / 2, H / 2 - 40, '메모리 엔더', { ...font, fontSize: '40px', fontStyle: 'bold', color: '#e6edf5' }).setOrigin(0.5);
      this.add.text(W / 2, H - 46, 'M = 소리 켜기 / 끄기', { ...font, fontSize: '11px', color: '#56677a' }).setOrigin(0.5);
      this.add.text(W / 2, H / 2 + 6, 'Memory Ender', { ...font, fontSize: '16px', color: '#7f93a8' }).setOrigin(0.5);
      const go = (key) => {
        if (this.leaving) return; this.leaving = true;
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key));
      };
      // 처음부터 시작
      const start = this.add.text(W / 2, H / 2 + 70, '처음부터 시작', { ...font, fontSize: '16px', color: '#e6edf5', backgroundColor: '#2c394a', padding: { x: 16, y: 7 } })
        .setOrigin(0.5).setInteractive({ useHandCursor: true });
      start.on('pointerdown', () => { ME.sfx.unlock(); ME.sfx.play('ui'); go('Investigate'); });
      // 챕터 선택 (건너뛰기) — 개발 빌드에서만
      if (ME.DEV) {
      this.add.text(W / 2, H / 2 + 34, '(개발 빌드)', { ...font, fontSize: '11px', color: '#56677a' }).setOrigin(0.5);
      this.add.text(W / 2, H / 2 + 122, '챕터 선택', { ...font, fontSize: '12px', color: '#7f93a8' }).setOrigin(0.5);
      [['1. 추리', 'Investigate'], ['2. 추격', 'Chase'], ['3. 장례', 'Funeral']].forEach(([label, key], i) => {
        const b = this.add.text(W / 2 + (i - 1) * 110, H / 2 + 152, label, { ...font, fontSize: '14px', color: '#9fb3c8', backgroundColor: '#222c3a', padding: { x: 12, y: 5 } })
          .setOrigin(0.5).setInteractive({ useHandCursor: true });
        b.on('pointerover', () => b.setColor('#ffffff')).on('pointerout', () => b.setColor('#9fb3c8'));
        b.on('pointerdown', () => { ME.sfx.unlock(); ME.sfx.play('ui'); go(key); });
      });
      this.add.text(W / 2, H - 24, '플레이 중 Esc = 타이틀로', { ...font, fontSize: '11px', color: '#56677a' }).setOrigin(0.5);
      }
    }
  }

  // 개발 빌드: 어느 장면에서든 Esc를 누르면 타이틀로 (테스트 편의)
  window.addEventListener('keydown', (e) => {
    if (!ME.DEV || e.key !== 'Escape' || !window.__meGame) return;
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
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [TitleScene, ME.InvestigateScene, ME.ChaseScene, ME.FuneralScene],
  });
})();
