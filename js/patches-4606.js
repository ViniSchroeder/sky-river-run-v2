replaceEvery(
  '      points = 200;',
  '      points = 500;',
  'helicóptero vale 500 pontos'
);
replaceEvery(
  '      points = 45;',
  '      points = 100;',
  'ave vale 100 pontos'
);
replaceEvery(
  '      points = 380;',
  '      points = 800;',
  'disco voador vale 800 pontos'
);
replaceEvery(
  '            this.score += 260;',
  '            this.score += 1000;',
  'caminhão vale 1000 pontos'
);

replaceEvery(
  '    boss.fuelSupplyTimer = (boss.fuelSupplyTimer ?? 30) - dt;',
  '    boss.fuelSupplyTimer = (boss.fuelSupplyTimer ?? 20) - dt;',
  'gasolina do chefe inicia em 20 segundos'
);
replaceEvery(
  '      boss.fuelSupplyTimer += 30;',
  '      boss.fuelSupplyTimer += 20;',
  'gasolina do chefe a cada 20 segundos'
);
replaceEvery(
  '    boss.bombSupplyTimer = (boss.bombSupplyTimer ?? 20) - dt;',
  '    boss.bombSupplyTimer = (boss.bombSupplyTimer ?? 15) - dt;',
  'bomba do chefe inicia em 15 segundos'
);
replaceEvery(
  '      boss.bombSupplyTimer += 20;',
  '      boss.bombSupplyTimer += 15;',
  'bomba do chefe a cada 15 segundos'
);
replaceEvery(
  '    boss.phase += dt;',
  `    boss.repairSupplyTimer = (boss.repairSupplyTimer ?? 25) - dt;
    if (boss.repairSupplyTimer <= 0) {
      boss.repairSupplyTimer += 25;
      this.spawnItem(null, -32, 'repair');
      this.ui.message('REPARO DE APOIO', 850);
    }
    boss.phase += dt;`,
  'reparo do chefe a cada 25 segundos'
);

replaceEvery(
  "  paused(value) { this.pauseOverlay.classList.toggle('hidden', !value); }\n}",
  `  paused(value) { this.pauseOverlay.classList.toggle('hidden', !value); }
  celebrateStage(stage) {
    const banner = this.stageBanner;
    clearTimeout(this.stageTimer);
    banner.textContent = 'FASE ' + stage;
    banner.classList.remove('stage-victory', 'stage-bubble-pop');
    void banner.offsetWidth;
    banner.classList.add('stage-victory');
    banner.style.opacity = '1';

    if (!this.game.audio.muted && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance('Fase ' + stage);
        utterance.lang = 'pt-BR';
        utterance.rate = 0.88;
        utterance.pitch = 1.02;
        utterance.volume = 0.88;
        const voices = window.speechSynthesis.getVoices?.() ?? [];
        const ptVoice = voices.find(voice => String(voice.lang).toLowerCase().startsWith('pt-br'))
          ?? voices.find(voice => String(voice.lang).toLowerCase().startsWith('pt'));
        if (ptVoice) utterance.voice = ptVoice;
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.warn('Voz de passagem de fase indisponível:', error);
      }
    }

    this.stageTimer = setTimeout(() => {
      banner.classList.add('stage-bubble-pop');
      setTimeout(() => {
        banner.style.opacity = '0';
        banner.classList.remove('stage-victory', 'stage-bubble-pop');
      }, 480);
    }, 1550);
  }
}`,
  'display e voz da passagem de fase'
);

replaceOnce(
  /  finishStage\(\) \{[\s\S]*?\n  \}\n\n  useBomb/,
  `  finishStage() {
    const retainedWeapon = this.player.weapon;
    const retainedStar = this.starUpgradeActive;
    this.bossKills += 1;
    const grantStar = this.bossKills === 5 && !this.starUpgradeActive;
    this.stage += 1;
    this.stageTime = 0;
    this.bossSpawned = false;
    this.birdRewardStage = 0;
    this.lifeSpawnedStage = 0;
    this.resetStageSpawnPlan();
    this.player.fuel = Math.min(100, this.player.fuel + 35);
    this.player.damage = Math.max(0, this.player.damage - 28);
    this.applyStageTheme();
    this.player.weapon = retainedWeapon;
    this.starUpgradeActive = retainedStar;
    this.ui.celebrateStage(this.stage);
    if (grantStar) {
      this.spawnItem(null, -24, 'star');
      setTimeout(() => this.ui.message('SUPER ESTRELA LIBERADA', 2200), 2050);
    }
  }

  useBomb`,
  'passagem de fase celebrada sem perder armamento'
);
