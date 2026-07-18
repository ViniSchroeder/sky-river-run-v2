replaceOnce(
  'new Game();',
  `Game.prototype.resize = function() {
  const aspect = innerWidth / innerHeight;
  const portrait = aspect < 0.85;
  const viewHeight = this.isMobile ? (portrait ? 44 : 27) : (portrait ? 52 : 29);
  this.camera.top = viewHeight / 2;
  this.camera.bottom = -viewHeight / 2;
  this.camera.left = -viewHeight * aspect / 2;
  this.camera.right = viewHeight * aspect / 2;
  this.camera.updateProjectionMatrix();
  this.renderer.setSize(innerWidth, innerHeight);
  this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, this.isMobile ? 1.0 : 1.35));
};

Game.prototype.bindControls = function() {
  const mobileDevice = matchMedia('(pointer:coarse)').matches || innerWidth < 900;
  this.isMobile = mobileDevice;
  this.joystick = this.joystick ?? { x: 0, y: 0 };
  this.joystickTarget = { x: 0, y: 0 };

  const preventKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);
  addEventListener('keydown', event => {
    if (preventKeys.has(event.code)) event.preventDefault();
    this.keys.add(event.code);
    if (event.code === 'Space') this.firing = true;
    if (event.code === 'KeyB' && !event.repeat) this.useBomb();
    if (event.code === 'KeyP' && !event.repeat) this.togglePause();
  });
  addEventListener('keyup', event => {
    this.keys.delete(event.code);
    if (event.code === 'Space') this.firing = false;
  });

  document.querySelector('#playButton').onclick = () => this.start();
  document.querySelector('#restartButton').onclick = () => this.start();
  document.querySelector('#pauseButton').onclick = () => this.togglePause();
  document.querySelector('#resumeButton').onclick = () => this.togglePause(false);
  document.querySelector('#fullscreenButton').onclick = () => document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.();
  document.querySelector('#soundButton').onclick = event => {
    this.audio.muted = !this.audio.muted;
    event.currentTarget.textContent = this.audio.muted ? '🔇' : '🔊';
    if (this.audio.muted) {
      this.audio.stopEngine();
      this.audio.stopMusic();
      window.speechSynthesis?.cancel?.();
    } else if (this.running && !this.paused) {
      this.audio.startEngine();
      this.audio.startMusic();
    }
  };

  const fireButton = document.querySelector('#fireButton');
  const bombButton = document.querySelector('#bombButton');
  let fireTouchId = null;
  let lastBombAt = 0;

  if (mobileDevice) {
    fireButton.addEventListener('touchstart', event => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      event.preventDefault();
      event.stopPropagation();
      fireTouchId = touch.identifier;
      this.mobileFiring = true;
      fireButton.classList.add('pressed');
    }, { passive: false });

    const releaseFire = event => {
      if (fireTouchId === null) return;
      const released = Array.from(event.changedTouches ?? []).some(touch => touch.identifier === fireTouchId);
      if (!released) return;
      fireTouchId = null;
      this.mobileFiring = false;
      fireButton.classList.remove('pressed');
    };
    document.addEventListener('touchend', releaseFire, { passive: true });
    document.addEventListener('touchcancel', releaseFire, { passive: true });

    bombButton.addEventListener('touchstart', event => {
      event.preventDefault();
      event.stopPropagation();
      const now = performance.now();
      if (now - lastBombAt < 260) return;
      lastBombAt = now;
      bombButton.classList.add('pressed');
      this.useBomb();
      setTimeout(() => bombButton.classList.remove('pressed'), 120);
    }, { passive: false });
  } else {
    fireButton.addEventListener('pointerdown', event => {
      event.preventDefault();
      this.mobileFiring = true;
    });
    for (const name of ['pointerup', 'pointercancel', 'pointerleave']) {
      fireButton.addEventListener(name, () => { this.mobileFiring = false; });
    }
    bombButton.addEventListener('pointerdown', event => {
      event.preventDefault();
      this.useBomb();
    });
  }

  const joystick = document.querySelector('#joystick');
  const knob = document.querySelector('#joystickKnob');
  let joystickTouchId = null;
  let joystickPointerId = null;

  const setJoystickPoint = (clientX, clientY) => {
    const rect = joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const knobRadius = Math.max(24, knob.getBoundingClientRect().width / 2);
    const max = Math.max(36, rect.width / 2 - knobRadius - 7);
    let physicalX = clientX - centerX;
    let physicalY = clientY - centerY;
    const physicalLength = Math.hypot(physicalX, physicalY) || 1;
    if (physicalLength > max) {
      physicalX = physicalX / physicalLength * max;
      physicalY = physicalY / physicalLength * max;
    }

    const rawX = physicalX / max;
    const rawY = physicalY / max;
    const magnitude = Math.min(1, Math.hypot(rawX, rawY));
    const deadZone = 0.075;
    let targetX = 0;
    let targetY = 0;
    if (magnitude > deadZone) {
      const normalized = (magnitude - deadZone) / (1 - deadZone);
      const strength = Math.pow(normalized, 1.28) * 0.86;
      targetX = rawX / magnitude * strength;
      targetY = rawY / magnitude * strength;
    }

    this.joystickTarget.x = targetX;
    this.joystickTarget.y = targetY;
    knob.style.transform = 'translate3d(' + physicalX + 'px,' + physicalY + 'px,0)';
  };

  const resetJoystick = () => {
    joystickTouchId = null;
    joystickPointerId = null;
    this.joystickTarget.x = 0;
    this.joystickTarget.y = 0;
    joystick.classList.remove('active');
    knob.style.transform = 'translate3d(0,0,0)';
  };

  if (mobileDevice && 'ontouchstart' in window) {
    joystick.addEventListener('touchstart', event => {
      if (joystickTouchId !== null) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      event.preventDefault();
      event.stopPropagation();
      joystickTouchId = touch.identifier;
      joystick.classList.add('active');
      setJoystickPoint(touch.clientX, touch.clientY);
    }, { passive: false });

    document.addEventListener('touchmove', event => {
      if (joystickTouchId === null) return;
      const touch = Array.from(event.touches).find(candidate => candidate.identifier === joystickTouchId);
      if (!touch) return;
      event.preventDefault();
      setJoystickPoint(touch.clientX, touch.clientY);
    }, { passive: false });

    const releaseJoystickTouch = event => {
      if (joystickTouchId === null) return;
      const released = Array.from(event.changedTouches ?? []).some(touch => touch.identifier === joystickTouchId);
      if (released) resetJoystick();
    };
    document.addEventListener('touchend', releaseJoystickTouch, { passive: true });
    document.addEventListener('touchcancel', releaseJoystickTouch, { passive: true });
  } else {
    joystick.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && mobileDevice) return;
      event.preventDefault();
      joystickPointerId = event.pointerId;
      joystick.classList.add('active');
      joystick.setPointerCapture?.(event.pointerId);
      setJoystickPoint(event.clientX, event.clientY);
    });
    joystick.addEventListener('pointermove', event => {
      if (joystickPointerId === null || event.pointerId !== joystickPointerId) return;
      event.preventDefault();
      setJoystickPoint(event.clientX, event.clientY);
    });
    const releasePointer = event => {
      if (joystickPointerId === null || event.pointerId !== joystickPointerId) return;
      event.preventDefault();
      resetJoystick();
    };
    joystick.addEventListener('pointerup', releasePointer);
    joystick.addEventListener('pointercancel', releasePointer);
  }

  const canvas = this.renderer.domElement;
  canvas.style.cursor = mobileDevice ? 'default' : 'crosshair';
  const updateMouseTarget = event => {
    if (mobileDevice || (event.pointerType && event.pointerType !== 'mouse')) return;
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.mouseRaycaster.setFromCamera(ndc, this.camera);
    if (this.mouseRaycaster.ray.intersectPlane(this.mousePlane, this.mousePoint)) {
      this.mouseControl.active = true;
      this.mouseControl.x = this.mousePoint.x;
      this.mouseControl.z = clamp(this.mousePoint.z, -15.5, 12.2);
    }
  };
  canvas.addEventListener('pointermove', updateMouseTarget);
  canvas.addEventListener('pointerdown', event => {
    if (mobileDevice || (event.pointerType && event.pointerType !== 'mouse')) return;
    updateMouseTarget(event);
    if (event.button === 0) this.firing = true;
    if (event.button === 2) event.preventDefault();
  });
  canvas.addEventListener('pointerup', event => {
    if (event.button === 0) this.firing = false;
  });
  canvas.addEventListener('pointerleave', () => { this.firing = false; });
  canvas.addEventListener('contextmenu', event => {
    event.preventDefault();
    if (!mobileDevice) this.useBomb();
  });

  if (mobileDevice) {
    document.addEventListener('gesturestart', event => event.preventDefault(), { passive: false });
    document.addEventListener('gesturechange', event => event.preventDefault(), { passive: false });
    document.addEventListener('dblclick', event => event.preventDefault(), { passive: false });
  }

  const resetMobileInput = () => {
    resetJoystick();
    this.mobileFiring = false;
    fireTouchId = null;
    fireButton.classList.remove('pressed');
  };
  addEventListener('orientationchange', resetMobileInput);
  addEventListener('resize', resetMobileInput);
  document.addEventListener('visibilitychange', () => {
    resetMobileInput();
    if (document.hidden && this.running && !this.paused) this.togglePause(true);
  });
};

Game.prototype.updatePlayer = function(dt) {
  const mobile = this.isMobile;
  if (mobile) {
    const inputBlend = 1 - Math.exp(-dt * 13.5);
    this.joystick.x = lerp(this.joystick.x, this.joystickTarget?.x ?? 0, inputBlend);
    this.joystick.y = lerp(this.joystick.y, this.joystickTarget?.y ?? 0, inputBlend);
  }

  let dx = this.joystick.x;
  let dz = this.joystick.y;
  if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) dx -= 1;
  if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) dx += 1;
  if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) dz -= 1;
  if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) dz += 1;

  const inputMagnitude = Math.hypot(dx, dz);
  if (inputMagnitude > 0.012) {
    this.mouseControl.active = false;
    if (mobile) {
      this.player.targetX += dx * 8.8 * dt;
      this.player.targetZ += dz * 6.0 * dt;
    } else {
      const len = inputMagnitude || 1;
      this.player.targetX += dx / len * 27.5 * dt;
      this.player.targetZ += dz / len * 18.5 * dt;
    }
  } else if (this.mouseControl.active) {
    this.player.targetX = this.mouseControl.x;
    this.player.targetZ = this.mouseControl.z;
    dx = clamp((this.player.targetX - this.player.x) * 0.18, -1, 1);
    dz = clamp((this.player.targetZ - this.player.z) * 0.18, -1, 1);
  }

  if (this.weatherMode === 'desert') {
    this.player.targetX += this.desertWind * dt;
    dx += clamp(this.desertWind * 0.12, -0.45, 0.45);
  }

  this.player.targetZ = clamp(this.player.targetZ, mobile ? -8.8 : -15.5, mobile ? 16.2 : 12.2);
  const targetRiver = this.riverAt(this.player.targetZ);
  const margin = mobile ? 1.12 : 0.95;
  this.player.targetX = clamp(this.player.targetX, targetRiver.left + margin, targetRiver.right - margin);

  const positionBlend = 1 - Math.exp(-dt * (mobile ? 10.5 : 20));
  this.player.x = lerp(this.player.x, this.player.targetX, positionBlend);
  this.player.z = lerp(this.player.z, this.player.targetZ, positionBlend);
  this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);
  this.player.shield = Math.max(0, this.player.shield - dt);
  this.shieldBubble.visible = this.player.shield > 0;
  if (this.shieldBubble.visible) {
    const pulse = 1 + Math.sin(this.time * 8) * 0.06;
    this.shieldBubble.scale.setScalar(pulse);
    this.shieldBubble.material.opacity = 0.16 + Math.sin(this.time * 9) * 0.04;
  }

  this.player.damageCooldown = Math.max(0, this.player.damageCooldown - dt);
  const currentRiver = this.riverAt(this.player.z);
  if (this.player.x < currentRiver.left + 0.72 || this.player.x > currentRiver.right - 0.72) {
    if (this.player.damageCooldown <= 0) {
      this.hitPlayer(10);
      this.player.damageCooldown = 0.42;
    }
    this.player.x = clamp(this.player.x, currentRiver.left + 0.58, currentRiver.right - 0.58);
    this.player.targetX = this.player.x;
  }

  this.playerObject.position.x = this.player.x;
  this.playerObject.position.z = this.player.z;
  this.playerObject.rotation.z = lerp(this.playerObject.rotation.z, -dx * 0.22, 1 - Math.exp(-dt * 9));
  this.playerObject.rotation.x = lerp(this.playerObject.rotation.x, dz * 0.08, 1 - Math.exp(-dt * 7));
  if (this.playerObject.userData.propeller) this.playerObject.userData.propeller.rotation.z += dt * 34;

  if ((this.player.respawnTimer ?? 0) > 0) {
    this.player.respawnTimer = Math.max(0, this.player.respawnTimer - dt);
    const respawnProgress = 1 - this.player.respawnTimer / 2.6;
    this.playerObject.scale.setScalar(0.72 + respawnProgress * 0.28);
    const blinkRate = 8 + respawnProgress * 13;
    this.playerObject.visible = this.player.respawnTimer < 0.32 || Math.floor((2.6 - this.player.respawnTimer) * blinkRate) % 2 === 0;
  } else {
    this.playerObject.scale.setScalar(this.starUpgradeActive ? 1.28 : 1);
    this.playerObject.visible = !(this.player.invulnerable > 0 && Math.floor(this.player.invulnerable * 16) % 2);
  }
};

new Game();`,
  'arquitetura móvel unificada e sem controladores concorrentes'
);
