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
    if (grantStar) {
      this.spawnItem(null, -24, 'star');
      this.ui.message('SUPER ESTRELA LIBERADA', 2200);
    }
  }

  useBomb`,
  'armamento permanece ao mudar de fase'
);

replaceOnce(
  /    const keyboardOrStick = Math\.abs\(dx\) > 0\.02 \|\| Math\.abs\(dz\) > 0\.02;[\s\S]*?    \} else if \(this\.mouseControl\.active\) \{/,
  `    const keyboardOrStick = Math.abs(dx) > 0.02 || Math.abs(dz) > 0.02;
    if (keyboardOrStick) {
      this.mouseControl.active = false;
      const magnitude = Math.min(1, Math.hypot(dx, dz));
      if (this.isMobile) {
        if (magnitude > 0.01) {
          const response = Math.pow(magnitude, 1.65);
          const nx = dx / magnitude;
          const nz = dz / magnitude;
          this.player.targetX += nx * response * 7.4 * dt;
          this.player.targetZ += nz * response * 4.8 * dt;
        }
      } else {
        const len = magnitude || 1;
        this.player.targetX += dx / len * 27.5 * dt;
        this.player.targetZ += dz / len * 18.5 * dt;
      }
    } else if (this.mouseControl.active) {`,
  'controle móvel preserva intensidade analógica'
);

replaceEvery(
  '      this.joystick.x = lerp(this.joystick.x, this.joystickTarget.x, Math.min(1, dt * 8));',
  '      this.joystick.x = lerp(this.joystick.x, this.joystickTarget.x, Math.min(1, dt * 4.2));',
  'suavização horizontal mais gradual'
);
replaceEvery(
  '      this.joystick.y = lerp(this.joystick.y, this.joystickTarget.y, Math.min(1, dt * 8));',
  '      this.joystick.y = lerp(this.joystick.y, this.joystickTarget.y, Math.min(1, dt * 4.2));',
  'suavização vertical mais gradual'
);
replaceEvery(
  '    this.player.x = lerp(this.player.x, this.player.targetX, Math.min(1, dt * 20));',
  '    this.player.x = lerp(this.player.x, this.player.targetX, Math.min(1, dt * (this.isMobile ? 8.2 : 20)));',
  'resposta horizontal móvel estabilizada'
);
replaceEvery(
  '    this.player.z = lerp(this.player.z, this.player.targetZ, Math.min(1, dt * 20));',
  '    this.player.z = lerp(this.player.z, this.player.targetZ, Math.min(1, dt * (this.isMobile ? 8.2 : 20)));',
  'resposta vertical móvel estabilizada'
);

replaceOnce(
  /    const joystick = document\.querySelector\('#joystick'\);[\s\S]*?    joystick\.addEventListener\('pointercancel', resetJoystick\);/,
  `    const joystick = document.querySelector('#joystick');
    const knob = document.querySelector('#joystickKnob');
    let active = false;
    let joystickPointerId = null;
    const updateJoystick = event => {
      if (!active || (joystickPointerId !== null && event.pointerId !== joystickPointerId)) return;
      event.preventDefault();
      const rect = joystick.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const max = rect.width * 0.30;
      let physicalX = event.clientX - centerX;
      let physicalY = event.clientY - centerY;
      const physicalLength = Math.hypot(physicalX, physicalY) || 1;
      if (physicalLength > max) {
        physicalX = physicalX / physicalLength * max;
        physicalY = physicalY / physicalLength * max;
      }
      const rawX = physicalX / max;
      const rawY = physicalY / max;
      const magnitude = Math.min(1, Math.hypot(rawX, rawY));
      const deadZone = 0.17;
      if (magnitude <= deadZone) {
        this.joystickTarget.x = 0;
        this.joystickTarget.y = 0;
      } else {
        const normalized = (magnitude - deadZone) / (1 - deadZone);
        const curved = Math.pow(normalized, 1.75) * 0.72;
        this.joystickTarget.x = rawX / magnitude * curved;
        this.joystickTarget.y = rawY / magnitude * curved;
      }
      knob.style.transform = 'translate(' + physicalX + 'px,' + physicalY + 'px)';
    };
    joystick.addEventListener('pointerdown', event => {
      event.preventDefault();
      active = true;
      joystickPointerId = event.pointerId;
      joystick.setPointerCapture?.(event.pointerId);
      updateJoystick(event);
    });
    joystick.addEventListener('pointermove', updateJoystick);
    const resetJoystick = event => {
      if (event?.pointerId !== undefined && joystickPointerId !== null && event.pointerId !== joystickPointerId) return;
      active = false;
      joystickPointerId = null;
      this.joystickTarget.x = 0;
      this.joystickTarget.y = 0;
      this.joystick.x = 0;
      this.joystick.y = 0;
      knob.style.transform = 'translate(0,0)';
    };
    joystick.addEventListener('pointerup', resetJoystick);
    joystick.addEventListener('pointercancel', resetJoystick);`,
  'joystick fixo com curva analógica suave'
);