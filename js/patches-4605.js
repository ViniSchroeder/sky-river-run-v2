replaceEvery(
  '          const response = Math.pow(magnitude, 1.65);',
  '          const response = Math.pow(magnitude, 1.08);',
  'resposta analógica móvel funcional'
);
replaceEvery(
  '          this.player.targetX += nx * response * 7.4 * dt;',
  '          this.player.targetX += nx * response * 8.2 * dt;',
  'velocidade horizontal móvel equilibrada'
);
replaceEvery(
  '          this.player.targetZ += nz * response * 4.8 * dt;',
  '          this.player.targetZ += nz * response * 5.8 * dt;',
  'velocidade vertical móvel equilibrada'
);
replaceEvery(
  '      this.joystick.x = lerp(this.joystick.x, this.joystickTarget.x, Math.min(1, dt * 4.2));',
  '      this.joystick.x = lerp(this.joystick.x, this.joystickTarget.x, Math.min(1, dt * 6.4));',
  'joystick horizontal responde sem travar'
);
replaceEvery(
  '      this.joystick.y = lerp(this.joystick.y, this.joystickTarget.y, Math.min(1, dt * 4.2));',
  '      this.joystick.y = lerp(this.joystick.y, this.joystickTarget.y, Math.min(1, dt * 6.4));',
  'joystick vertical responde sem travar'
);
replaceEvery(
  '      const max = rect.width * 0.30;',
  '      const max = rect.width * 0.34;',
  'curso físico útil da alavanca'
);
replaceEvery(
  '      const deadZone = 0.17;',
  '      const deadZone = 0.11;',
  'zona neutra móvel recalibrada'
);
replaceEvery(
  '        const curved = Math.pow(normalized, 1.75) * 0.72;',
  '        const curved = Math.pow(normalized, 1.12) * 0.92;',
  'curva da alavanca com movimento perceptível'
);

replaceOnce(
  'new Game();',
  `const bindControlsBefore4605 = Game.prototype.bindControls;
Game.prototype.bindControls = function() {
  bindControlsBefore4605.call(this);
  const mobileDevice = matchMedia('(pointer:coarse)').matches || innerWidth < 900;
  if (!mobileDevice) return;

  this.isMobile = true;
  this.joystickTarget = this.joystickTarget ?? { x: 0, y: 0 };

  const joystick = document.querySelector('#joystick');
  const knob = document.querySelector('#joystickKnob');
  if (!joystick || !knob) return;

  let activePointerId = null;

  const applyJoystickPoint = event => {
    const rect = joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const max = rect.width * 0.34;
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
    const deadZone = 0.10;
    let targetX = 0;
    let targetY = 0;
    if (magnitude > deadZone) {
      const normalized = (magnitude - deadZone) / (1 - deadZone);
      const strength = Math.pow(normalized, 1.10) * 0.92;
      targetX = rawX / magnitude * strength;
      targetY = rawY / magnitude * strength;
    }

    this.joystickTarget.x = targetX;
    this.joystickTarget.y = targetY;
    this.joystick.x = lerp(this.joystick.x, targetX, 0.58);
    this.joystick.y = lerp(this.joystick.y, targetY, 0.58);
    knob.style.transform = 'translate(' + physicalX + 'px,' + physicalY + 'px)';
  };

  const stopOldJoystickHandler = event => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  joystick.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse') return;
    stopOldJoystickHandler(event);
    activePointerId = event.pointerId;
    joystick.setPointerCapture?.(event.pointerId);
    applyJoystickPoint(event);
  }, { capture: true });

  joystick.addEventListener('pointermove', event => {
    if (activePointerId === null || event.pointerId !== activePointerId) return;
    stopOldJoystickHandler(event);
    applyJoystickPoint(event);
  }, { capture: true });

  const releaseJoystick = event => {
    if (activePointerId === null || (event.pointerId !== undefined && event.pointerId !== activePointerId)) return;
    stopOldJoystickHandler(event);
    activePointerId = null;
    this.joystickTarget.x = 0;
    this.joystickTarget.y = 0;
    this.joystick.x = 0;
    this.joystick.y = 0;
    knob.style.transform = 'translate(0,0)';
  };

  joystick.addEventListener('pointerup', releaseJoystick, { capture: true });
  joystick.addEventListener('pointercancel', releaseJoystick, { capture: true });
};

new Game();`,
  'fallback móvel robusto para eventos de toque'
);
