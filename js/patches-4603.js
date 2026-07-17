replaceEvery(
  '      hp = 4 + Math.floor(this.stage * 0.45);',
  '      hp = 6 * Math.min(4, Math.max(1, this.player.weapon));',
  'resistência do helicóptero acompanha o armamento'
);
replaceEvery(
  '      points = 150;',
  '      points = 200;',
  'helicóptero vale 200 pontos'
);
replaceEvery(
  '          this.damageEnemy(enemy, bullet.damage);',
  "          this.damageEnemy(enemy, enemy.type === 'helicopter' ? 1 : bullet.damage);",
  'cada projétil conta como um acerto no helicóptero'
);

replaceEvery(
  '    this.joystick = { x: 0, y: 0 };',
  '    this.joystick = { x: 0, y: 0 };\n    this.joystickTarget = { x: 0, y: 0 };',
  'alvo suavizado do joystick móvel'
);
replaceEvery(
  '    let dx = this.joystick.x;',
  '    if (this.isMobile && this.joystickTarget) {\n      this.joystick.x = lerp(this.joystick.x, this.joystickTarget.x, Math.min(1, dt * 8));\n      this.joystick.y = lerp(this.joystick.y, this.joystickTarget.y, Math.min(1, dt * 8));\n    }\n    let dx = this.joystick.x;',
  'movimento suave do joystick'
);
replaceEvery(
  '      this.player.targetX += dx / len * 21.5 * dt;',
  '      const mobileMoveScale = this.isMobile ? 0.78 : 1;\n      this.player.targetX += dx / len * 21.5 * dt * mobileMoveScale;',
  'sensibilidade móvel calibrada'
);
replaceEvery(
  '      this.player.targetZ += dz / len * 11.5 * dt;',
  '      this.player.targetZ += dz / len * 11.5 * dt * mobileMoveScale;',
  'movimento vertical móvel calibrado'
);
replaceEvery(
  '    this.player.targetZ = clamp(this.player.targetZ, -5.5, 11.2);',
  '    this.player.targetZ = clamp(this.player.targetZ, this.isMobile ? -7.2 : -5.5, this.isMobile ? 16.5 : 11.2);',
  'avião móvel pode recuar até o limite inferior'
);
replaceEvery(
  '    this.player.x = lerp(this.player.x, this.player.targetX, Math.min(1, dt * 17));',
  '    this.player.x = lerp(this.player.x, this.player.targetX, Math.min(1, dt * (this.isMobile ? 12.5 : 17)));',
  'suavização horizontal móvel'
);
replaceEvery(
  '    this.player.z = lerp(this.player.z, this.player.targetZ, Math.min(1, dt * 17));',
  '    this.player.z = lerp(this.player.z, this.player.targetZ, Math.min(1, dt * (this.isMobile ? 12.5 : 17)));',
  'suavização vertical móvel'
);

replaceOnce(
  /    const joystick = document\.querySelector\('#joystick'\);[\s\S]*?    joystick\.addEventListener\('pointercancel', resetJoystick\);/,
  `    const joystick = document.querySelector('#joystick');
    const knob = document.querySelector('#joystickKnob');
    let active = false;
    let joystickPointerId = null;
    let joystickOriginX = 0;
    let joystickOriginY = 0;
    const updateJoystick = event => {
      if (!active || (joystickPointerId !== null && event.pointerId !== joystickPointerId)) return;
      event.preventDefault();
      const rect = joystick.getBoundingClientRect();
      const max = rect.width * 0.34;
      let dx = event.clientX - joystickOriginX;
      let dy = event.clientY - joystickOriginY;
      const length = Math.hypot(dx, dy) || 1;
      if (length > max) {
        dx = dx / length * max;
        dy = dy / length * max;
      }
      const deadZone = 0.11;
      const rawX = dx / max;
      const rawY = dy / max;
      const magnitude = Math.hypot(rawX, rawY);
      if (magnitude <= deadZone) {
        this.joystickTarget.x = 0;
        this.joystickTarget.y = 0;
      } else {
        const normalizedMagnitude = Math.min(1, (magnitude - deadZone) / (1 - deadZone));
        this.joystickTarget.x = rawX / magnitude * normalizedMagnitude;
        this.joystickTarget.y = rawY / magnitude * normalizedMagnitude;
      }
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    };
    joystick.addEventListener('pointerdown', event => {
      event.preventDefault();
      active = true;
      joystickPointerId = event.pointerId;
      joystickOriginX = event.clientX;
      joystickOriginY = event.clientY;
      this.joystickTarget.x = 0;
      this.joystickTarget.y = 0;
      joystick.setPointerCapture?.(event.pointerId);
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
  'joystick móvel flutuante e calibrado'
);

replaceEvery(
  "    document.querySelector('#bombButton').addEventListener('pointerdown', event => { event.preventDefault(); this.useBomb(); });",
  `    const bombButton = document.querySelector('#bombButton');
    let lastBombTouch = 0;
    const triggerBomb = event => {
      event.preventDefault();
      event.stopPropagation();
      const now = performance.now();
      if (now - lastBombTouch < 170) return;
      lastBombTouch = now;
      this.useBomb();
    };
    bombButton.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch') return;
      triggerBomb(event);
    });
    bombButton.addEventListener('touchstart', triggerBomb, { passive: false });
    bombButton.addEventListener('dblclick', event => event.preventDefault());`,
  'botão de bomba sem zoom por toque duplo'
);
