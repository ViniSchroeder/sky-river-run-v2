const canvas = document.querySelector("#game");
const context = canvas.getContext("2d", { alpha: false });

const elements = {
  hud: document.querySelector("#hud"),
  menu: document.querySelector("#menu"),
  gameOver: document.querySelector("#gameOver"),
  playButton: document.querySelector("#playButton"),
  restartButton: document.querySelector("#restartButton"),
  soundButton: document.querySelector("#soundButton"),
  fireButton: document.querySelector("#fireButton"),
  bombButton: document.querySelector("#bombButton"),
  fuelText: document.querySelector("#fuelText"),
  fuelBar: document.querySelector("#fuelBar"),
  lives: document.querySelector("#lives"),
  weapon: document.querySelector("#weapon"),
  bombCount: document.querySelector("#bombCount"),
  score: document.querySelector("#score"),
  finalScore: document.querySelector("#finalScore"),
  record: document.querySelector("#record"),
  finalRecord: document.querySelector("#finalRecord"),
  message: document.querySelector("#message"),
};

const CONFIG = {
  maxDelta: 0.045,
  initialSpeed: 225,
  fuelDrain: 4.4,
  scoreRate: 13,
  playerSpeed: 310,
  bulletSpeed: 660,
  recordKey: "sky-river-run-record-v1",
};

let width = innerWidth;
let height = innerHeight;
let pixelRatio = Math.min(devicePixelRatio || 1, 2);
let previousTime = performance.now();
let running = false;
let pointerActive = false;
let firing = false;
let mobileFiring = false;
let soundMuted = false;
let audioContext = null;
let engineOscillator = null;
let engineGain = null;
let messageTimer = 0;
let record = Number(localStorage.getItem(CONFIG.recordKey) || 0);

const pressedKeys = new Set();

const state = {
  time: 0,
  score: 0,
  fuel: 100,
  lives: 3,
  bombs: 0,
  weaponLevel: 1,
  worldSpeed: CONFIG.initialSpeed,
  riverPhase: 0,
  obstacleTimer: 0.6,
  lateralTimer: 3.2,
  waterEnemyTimer: 4.4,
  fireTimer: 0,
  fuelTimer: 1.6,
  bombTimer: 6,
  bridgeTimer: 9,
  cloudTimer: 7,
  shake: 0,
  player: {
    x: width / 2,
    y: height * 0.76,
    targetX: width / 2,
    targetY: height * 0.76,
    tilt: 0,
    invulnerable: 0,
  },
  obstacles: [],
  waterEnemies: [],
  fuelPickups: [],
  bombPickups: [],
  bullets: [],
  bridges: [],
  particles: [],
  clouds: [],
};

function resizeCanvas() {
  width = innerWidth;
  height = innerHeight;
  pixelRatio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.floor(width * pixelRatio);
  canvas.height = Math.floor(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
}

function initializeAudio() {
  try {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return false;
    if (!audioContext) audioContext = new AudioCtor();
    if (audioContext.state === "suspended") audioContext.resume();
    return true;
  } catch {
    return false;
  }
}

function playTone(frequency, duration = 0.08, type = "square", volume = 0.07) {
  if (soundMuted || !initializeAudio()) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function startEngineSound() {
  if (soundMuted || engineOscillator || !initializeAudio()) return;
  engineOscillator = audioContext.createOscillator();
  engineGain = audioContext.createGain();
  engineOscillator.type = "sawtooth";
  engineOscillator.frequency.value = 78;
  engineGain.gain.value = 0.025;
  engineOscillator.connect(engineGain).connect(audioContext.destination);
  engineOscillator.start();
}

function stopEngineSound() {
  if (!engineOscillator) return;
  try {
    engineOscillator.stop();
  } catch {
    // Already stopped.
  }
  engineOscillator = null;
  engineGain = null;
}

function riverCenter(y) {
  const normalizedY = y / Math.max(height, 1);
  const wave = normalizedY * 2.7 + state.riverPhase;
  return (
    width * 0.5 +
    Math.sin(wave) * width * 0.14 +
    Math.sin(wave * 2.2) * width * 0.045
  );
}

function riverHalfWidth(y) {
  const normalizedY = y / Math.max(height, 1);
  const wave = normalizedY * 4.1 + state.riverPhase * 0.8;
  return Math.max(width * 0.18, width * 0.30 + Math.sin(wave) * width * 0.042);
}

function riverBounds(y, margin = 0) {
  const center = riverCenter(y);
  const halfWidth = Math.max(28, riverHalfWidth(y) - margin);
  return {
    left: center - halfWidth,
    right: center + halfWidth,
  };
}

function resetState() {
  state.time = 0;
  state.score = 0;
  state.fuel = 100;
  state.lives = 3;
  state.bombs = 0;
  state.weaponLevel = 1;
  state.worldSpeed = CONFIG.initialSpeed;
  state.riverPhase = 0;
  state.obstacleTimer = 0.6;
  state.lateralTimer = 3.2;
  state.waterEnemyTimer = 4.4;
  state.fireTimer = 0;
  state.fuelTimer = 1.6;
  state.bombTimer = 6;
  state.bridgeTimer = 9;
  state.cloudTimer = 7;
  state.shake = 0;

  Object.assign(state.player, {
    x: width / 2,
    y: height * 0.76,
    targetX: width / 2,
    targetY: height * 0.76,
    tilt: 0,
    invulnerable: 0,
  });

  state.obstacles = [];
  state.waterEnemies = [];
  state.fuelPickups = [];
  state.bombPickups = [];
  state.bullets = [];
  state.bridges = [];
  state.particles = [];
  state.clouds = [];

  updateHud();
}

function updateHud() {
  const fuel = Math.max(0, Math.round(state.fuel));
  elements.score.textContent = String(Math.floor(state.score));
  elements.fuelText.textContent = `${fuel}%`;
  elements.fuelBar.style.width = `${fuel}%`;
  elements.fuelBar.style.background =
    fuel < 30
      ? "linear-gradient(90deg, #ff4b4b, #ffac36)"
      : "linear-gradient(90deg, #5ef29a, #40d7ff)";
  elements.lives.textContent = `❤️ ${state.lives}`;
  elements.weapon.textContent = `🔫 ${state.weaponLevel}`;
  elements.bombCount.textContent = `💣 ${state.bombs}`;
  elements.bombButton.disabled = state.bombs < 1;
}

function showMessage(text, duration = 1000) {
  elements.message.textContent = text;
  elements.message.style.opacity = "1";
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => {
    elements.message.style.opacity = "0";
  }, duration);
}

function startGame() {
  initializeAudio();
  resetState();
  running = true;
  elements.menu.classList.add("hidden");
  elements.gameOver.classList.add("hidden");
  elements.hud.classList.remove("hidden");
  elements.fireButton.classList.remove("hidden");
  elements.bombButton.classList.remove("hidden");
  startEngineSound();
}

function finishGame() {
  running = false;
  firing = false;
  mobileFiring = false;
  stopEngineSound();
  playTone(180, 0.4, "sawtooth", 0.16);

  const finalScore = Math.floor(state.score);
  if (finalScore > record) {
    record = finalScore;
    localStorage.setItem(CONFIG.recordKey, String(record));
  }

  elements.finalScore.textContent = String(finalScore);
  elements.finalRecord.textContent = `Recorde: ${record}`;
  elements.hud.classList.add("hidden");
  elements.fireButton.classList.add("hidden");
  elements.bombButton.classList.add("hidden");
  elements.gameOver.classList.remove("hidden");
}

function createParticles(x, y, color, amount = 16) {
  for (let index = 0; index < amount; index += 1) {
    state.particles.push({
      x,
      y,
      velocityX: (Math.random() - 0.5) * 300,
      velocityY: (Math.random() - 0.5) * 300,
      life: 0.65,
      maxLife: 0.65,
      size: 2 + Math.random() * 4,
      color,
    });
  }
}

function loseLife() {
  if (!running) return;
  state.lives -= 1;
  playTone(70, 0.5, "sawtooth", 0.22);
  createParticles(state.player.x, state.player.y, "255,100,45", 30);
  state.shake = 1.4;

  if (state.lives <= 0) {
    finishGame();
    return;
  }

  showMessage(`VIDAS: ${state.lives}`, 1100);
  state.fuel = 100;
  state.player.x = width / 2;
  state.player.y = height * 0.76;
  state.player.targetX = state.player.x;
  state.player.targetY = state.player.y;
  state.player.invulnerable = 2.2;

  state.waterEnemies = state.waterEnemies.filter(
    (item) => !item.destroyed && item.y < height + 100,
  );
  state.obstacles = state.obstacles.filter(
    (item) => Math.abs(item.y - state.player.y) > 190,
  );
  state.bridges = state.bridges.filter(
    (item) => Math.abs(item.y - state.player.y) > 190,
  );
  updateHud();
}

function damagePlayer(amount = 18) {
  if (!running || state.player.invulnerable > 0) return;
  state.player.invulnerable = 0.8;
  state.fuel -= amount;
  state.shake = 0.8;
  playTone(105, 0.2, "sawtooth", 0.16);
  createParticles(state.player.x, state.player.y, "255,120,55", 16);
  navigator.vibrate?.(50);

  if (state.fuel <= 0) loseLife();
}

function enemyConfig(type) {
  const configs = {
    bird: { size: 24, health: 1, points: 20 },
    glider: { size: 37, health: 2, points: 45 },
    helicopter: { size: 42, health: 4, points: 120 },
    ufo: { size: 34, health: 7, points: 350 },
    airplane: { size: 38, health: 3, points: 90 },
    boat: { size: 34, health: 3, points: 80 },
    submarine: { size: 38, health: 5, points: 180 },
    truck: { size: 30, health: 3, points: 160 },
  };
  return configs[type];
}

function spawnObstacle() {
  const y = -70;
  const bounds = riverBounds(y, 16);
  const chance = Math.random();

  let type = "bird";
  if (chance > 0.97) type = "ufo";
  else if (chance > 0.80) type = "helicopter";
  else if (chance > 0.48) type = "glider";

  const config = enemyConfig(type);
  state.obstacles.push({
    type,
    x: bounds.left + Math.random() * (bounds.right - bounds.left),
    y,
    size: config.size,
    health: config.health,
    points: config.points,
    velocityX:
      (Math.random() - 0.5) *
      (type === "bird" ? 90 : type === "ufo" ? 120 : 55),
    phase: Math.random() * Math.PI * 2,
    destroyed: false,
  });
}


function spawnLateralEnemy() {
  const types = ["bird", "airplane", "helicopter", "ufo"];
  const roll = Math.random();
  const type = roll > 0.93 ? "ufo" : roll > 0.70 ? "helicopter" : roll > 0.40 ? "airplane" : "bird";
  const config = enemyConfig(type);
  const fromLeft = Math.random() < 0.5;
  const y = height * (0.18 + Math.random() * 0.48);

  state.obstacles.push({
    type,
    movement: "lateral",
    x: fromLeft ? -config.size * 2 : width + config.size * 2,
    y,
    size: config.size,
    health: config.health,
    points: config.points + 25,
    velocityX: (fromLeft ? 1 : -1) * (125 + Math.random() * 95),
    phase: Math.random() * Math.PI * 2,
    destroyed: false,
  });
}

function spawnWaterEnemy() {
  const type = Math.random() < 0.68 ? "boat" : "submarine";
  const config = enemyConfig(type);
  const y = -70;
  const bounds = riverBounds(y, 45);

  state.waterEnemies.push({
    type,
    x: bounds.left + Math.random() * (bounds.right - bounds.left),
    y,
    size: config.size,
    health: config.health,
    points: config.points,
    phase: Math.random() * Math.PI * 2,
    emerged: type === "boat",
    emergeTimer: type === "submarine" ? 0.8 + Math.random() * 2.4 : 0,
    destroyed: false,
  });
}

function spawnFuel() {
  const y = -50;
  const bounds = riverBounds(y, 36);
  state.fuelPickups.push({
    x: bounds.left + Math.random() * (bounds.right - bounds.left),
    y,
    phase: Math.random() * Math.PI * 2,
    collected: false,
  });
}

function spawnBombPickup() {
  const y = -50;
  const bounds = riverBounds(y, 40);
  state.bombPickups.push({
    x: bounds.left + Math.random() * (bounds.right - bounds.left),
    y,
    phase: Math.random() * Math.PI * 2,
    collected: false,
  });
}

function spawnBridge() {
  const direction = Math.random() < 0.5 ? 1 : -1;
  state.bridges.push({
    y: -80,
    height: 38,
    destroyed: false,
    trucks: [
      {
        offsetX: direction > 0 ? -riverHalfWidth(-80) : riverHalfWidth(-80),
        direction,
        speed: 52 + Math.random() * 26,
        health: enemyConfig("truck").health,
        points: enemyConfig("truck").points,
        destroyed: false,
      },
    ],
  });
}

function fire() {
  if (!running) return;

  const offsets =
    state.weaponLevel === 1
      ? [0]
      : state.weaponLevel === 2
        ? [-10, 10]
        : [-16, 0, 16];

  for (const offset of offsets) {
    state.bullets.push({
      x: state.player.x + offset,
      y: state.player.y - 30,
      destroyed: false,
    });
  }

  playTone(520, 0.045, "square", 0.025);
}

function useBomb() {
  if (!running || state.bombs < 1) return;
  state.bombs -= 1;
  state.shake = 1.5;
  playTone(65, 0.55, "sawtooth", 0.26);
  navigator.vibrate?.([60, 40, 100]);

  for (const bridge of state.bridges) {
    if (
      !bridge.destroyed &&
      bridge.y > -120 &&
      bridge.y < height * 0.82
    ) {
      bridge.destroyed = true;
      state.score += 220;
      createParticles(riverCenter(bridge.y), bridge.y, "255,160,50", 44);
    }
  }

  for (const enemy of state.waterEnemies) {
    if (!enemy.destroyed && enemy.emerged && enemy.y > -80 && enemy.y < height * 0.80) {
      enemy.destroyed = true;
      state.score += Math.max(20, Math.floor(enemy.points * 0.35));
      createParticles(enemy.x, enemy.y, "255,120,55", 16);
    }
  }

  for (const obstacle of state.obstacles) {
    if (
      !obstacle.destroyed &&
      obstacle.y > -80 &&
      obstacle.y < height * 0.80
    ) {
      obstacle.destroyed = true;
      state.score += Math.max(10, Math.floor(obstacle.points * 0.35));
      createParticles(obstacle.x, obstacle.y, "255,120,55", 14);
    }
  }

  updateHud();
}

function constrainPlayerToRiver() {
  const bounds = riverBounds(state.player.y, 23);

  if (state.player.x < bounds.left) {
    state.player.x = bounds.left;
    state.player.targetX = Math.max(state.player.targetX, bounds.left);
    damagePlayer(10);
  } else if (state.player.x > bounds.right) {
    state.player.x = bounds.right;
    state.player.targetX = Math.min(state.player.targetX, bounds.right);
    damagePlayer(10);
  }
}

function circlesOverlap(aX, aY, aRadius, bX, bY, bRadius) {
  const deltaX = aX - bX;
  const deltaY = aY - bY;
  const radius = aRadius + bRadius;
  return deltaX * deltaX + deltaY * deltaY < radius * radius;
}

function destroyObstacle(obstacle) {
  obstacle.destroyed = true;
  state.score += obstacle.points;
  createParticles(
    obstacle.x,
    obstacle.y,
    "255,120,55",
    obstacle.type === "ufo" ? 32 : 18,
  );

  if (obstacle.type === "helicopter" && state.weaponLevel < 2) {
    state.weaponLevel = 2;
    showMessage("TIRO DUPLO!", 1200);
  }

  if (obstacle.type === "ufo" && state.weaponLevel < 3) {
    state.weaponLevel = 3;
    showMessage("TIRO TRIPLO!", 1200);
  }
}

function updatePlayer(delta) {
  let inputX = 0;
  let inputY = 0;

  if (pressedKeys.has("ArrowLeft") || pressedKeys.has("KeyA")) inputX -= 1;
  if (pressedKeys.has("ArrowRight") || pressedKeys.has("KeyD")) inputX += 1;
  if (pressedKeys.has("ArrowUp") || pressedKeys.has("KeyW")) inputY -= 1;
  if (pressedKeys.has("ArrowDown") || pressedKeys.has("KeyS")) inputY += 1;

  if (inputX || inputY) {
    const magnitude = Math.hypot(inputX, inputY) || 1;
    state.player.targetX += (inputX / magnitude) * CONFIG.playerSpeed * delta;
    state.player.targetY += (inputY / magnitude) * CONFIG.playerSpeed * delta;
  }

  const clampedTargetX = Math.max(
    20,
    Math.min(width - 20, state.player.targetX),
  );
  const clampedTargetY = Math.max(
    76,
    Math.min(height - 46, state.player.targetY),
  );

  const nextX =
    state.player.x +
    (clampedTargetX - state.player.x) * Math.min(1, delta * 11);
  const nextY =
    state.player.y +
    (clampedTargetY - state.player.y) * Math.min(1, delta * 11);

  state.player.tilt = Math.max(
    -0.55,
    Math.min(0.55, (nextX - state.player.x) * 0.05),
  );

  state.player.x = nextX;
  state.player.y = nextY;
  constrainPlayerToRiver();
}

function update(delta) {
  state.riverPhase += delta * 0.18;

  if (!running) return;

  state.time += delta;
  state.worldSpeed += delta * 3.2;
  state.score += delta * CONFIG.scoreRate;
  state.fuel -= delta * CONFIG.fuelDrain;
  state.fireTimer = Math.max(0, state.fireTimer - delta);
  if ((firing || mobileFiring) && state.fireTimer <= 0) {
    fire();
    state.fireTimer = Math.max(0.09, 0.18 - state.weaponLevel * 0.018);
  }

  state.player.invulnerable = Math.max(
    0,
    state.player.invulnerable - delta,
  );
  state.shake = Math.max(0, state.shake - delta * 3);

  updatePlayer(delta);

  state.obstacleTimer -= delta;
  if (state.obstacleTimer <= 0) {
    spawnObstacle();
    state.obstacleTimer =
      0.65 + Math.random() * 0.65 - Math.min(0.34, state.time / 75);
  }

  state.lateralTimer -= delta;
  if (state.lateralTimer <= 0) {
    spawnLateralEnemy();
    state.lateralTimer = 2.8 + Math.random() * 3.5;
  }

  state.waterEnemyTimer -= delta;
  if (state.waterEnemyTimer <= 0) {
    spawnWaterEnemy();
    state.waterEnemyTimer = 4 + Math.random() * 4.5;
  }

  state.fuelTimer -= delta;
  if (state.fuelTimer <= 0) {
    spawnFuel();
    state.fuelTimer = 2.2 + Math.random() * 2;
  }

  state.bombTimer -= delta;
  if (state.bombTimer <= 0) {
    spawnBombPickup();
    state.bombTimer = 7 + Math.random() * 5;
  }

  state.bridgeTimer -= delta;
  if (state.bridgeTimer <= 0) {
    spawnBridge();
    state.bridgeTimer = 9 + Math.random() * 6;
  }

  if (state.score >= 3000) {
    state.cloudTimer -= delta;
    if (state.cloudTimer <= 0) {
      state.clouds.push({
        x: Math.random() * width,
        y: -150,
        size: 90 + Math.random() * 120,
        velocity: 90 + Math.random() * 70,
        alpha: 0.70 + Math.random() * 0.18,
      });
      state.cloudTimer = 6 + Math.random() * 7;
    }
  }

  for (const obstacle of state.obstacles) {
    if (obstacle.movement === "lateral") {
      obstacle.x += obstacle.velocityX * delta;
      obstacle.y += state.worldSpeed * 0.10 * delta;
    } else {
      obstacle.y += state.worldSpeed * delta;
      obstacle.x += obstacle.velocityX * delta;
      const bounds = riverBounds(obstacle.y, 8);
      if (obstacle.x < bounds.left || obstacle.x > bounds.right) {
        obstacle.velocityX *= -1;
      }
    }
    obstacle.phase += delta * 9;
  }

  for (const enemy of state.waterEnemies) {
    enemy.y += state.worldSpeed * delta;
    enemy.phase += delta * 4;

    if (enemy.type === "submarine" && !enemy.emerged) {
      enemy.emergeTimer -= delta;
      if (enemy.emergeTimer <= 0) {
        enemy.emerged = true;
        playTone(130, 0.2, "sine", 0.08);
      }
    }
  }

  for (const pickup of state.fuelPickups) {
    pickup.y += state.worldSpeed * delta;
    pickup.phase += delta * 4;
  }

  for (const pickup of state.bombPickups) {
    pickup.y += state.worldSpeed * delta;
    pickup.phase += delta * 4;
  }

  for (const bullet of state.bullets) {
    bullet.y -= CONFIG.bulletSpeed * delta;
  }

  for (const bridge of state.bridges) {
    bridge.y += state.worldSpeed * delta;
    const bridgeWidth = riverHalfWidth(bridge.y) * 2;
    for (const truck of bridge.trucks || []) {
      if (truck.destroyed) continue;
      truck.offsetX += truck.direction * truck.speed * delta;
      if (Math.abs(truck.offsetX) > bridgeWidth / 2 + 42) {
        truck.direction *= -1;
      }
    }
  }

  for (const particle of state.particles) {
    particle.x += particle.velocityX * delta;
    particle.y += particle.velocityY * delta;
    particle.life -= delta;
  }

  for (const cloud of state.clouds) {
    cloud.y += (state.worldSpeed * 0.45 + cloud.velocity) * delta;
  }

  for (const bullet of state.bullets) {
    if (bullet.destroyed) continue;

    for (const obstacle of state.obstacles) {
      if (obstacle.destroyed) continue;

      if (
        circlesOverlap(
          bullet.x,
          bullet.y,
          4,
          obstacle.x,
          obstacle.y,
          obstacle.size * 0.65,
        )
      ) {
        bullet.destroyed = true;
        obstacle.health -= 1;
        createParticles(bullet.x, bullet.y, "255,230,150", 5);

        if (obstacle.health <= 0) destroyObstacle(obstacle);
        break;
      }
    }
  }


  for (const bullet of state.bullets) {
    if (bullet.destroyed) continue;

    for (const enemy of state.waterEnemies) {
      if (enemy.destroyed || !enemy.emerged) continue;
      if (
        circlesOverlap(
          bullet.x,
          bullet.y,
          4,
          enemy.x,
          enemy.y,
          enemy.size * 0.65,
        )
      ) {
        bullet.destroyed = true;
        enemy.health -= 1;
        createParticles(bullet.x, bullet.y, "255,230,150", 5);
        if (enemy.health <= 0) {
          enemy.destroyed = true;
          state.score += enemy.points;
          showMessage(`+${enemy.points}`, 500);
          createParticles(enemy.x, enemy.y, "255,120,55", 22);
        }
        break;
      }
    }
  }

  for (const bullet of state.bullets) {
    if (bullet.destroyed) continue;

    for (const bridge of state.bridges) {
      const center = riverCenter(bridge.y);
      for (const truck of bridge.trucks || []) {
        if (truck.destroyed) continue;
        const truckX = center + truck.offsetX;
        if (
          circlesOverlap(
            bullet.x,
            bullet.y,
            4,
            truckX,
            bridge.y,
            20,
          )
        ) {
          bullet.destroyed = true;
          truck.health -= 1;
          createParticles(bullet.x, bullet.y, "255,225,120", 5);
          if (truck.health <= 0) {
            truck.destroyed = true;
            state.score += truck.points;
            state.weaponLevel = Math.min(3, state.weaponLevel + 1);
            showMessage(`CAMINHÃO +${truck.points} • TIRO ${state.weaponLevel}`, 900);
            createParticles(truckX, bridge.y, "255,130,55", 24);
          }
          break;
        }
      }
      if (bullet.destroyed) break;
    }
  }

  for (const enemy of state.waterEnemies) {
    if (enemy.destroyed || !enemy.emerged) continue;
    if (
      circlesOverlap(
        enemy.x,
        enemy.y,
        enemy.size * 0.55,
        state.player.x,
        state.player.y,
        18,
      )
    ) {
      damagePlayer(enemy.type === "submarine" ? 28 : 20);
    }
  }

  for (const obstacle of state.obstacles) {
    if (obstacle.destroyed) continue;

    if (
      circlesOverlap(
        obstacle.x,
        obstacle.y,
        obstacle.size * 0.55,
        state.player.x,
        state.player.y,
        18,
      )
    ) {
      damagePlayer(
        obstacle.type === "ufo"
          ? 30
          : obstacle.type === "helicopter"
            ? 24
            : 18,
      );
    }
  }

  for (const pickup of state.fuelPickups) {
    if (
      !pickup.collected &&
      circlesOverlap(
        pickup.x,
        pickup.y,
        20,
        state.player.x,
        state.player.y,
        18,
      )
    ) {
      pickup.collected = true;
      state.fuel = Math.min(100, state.fuel + 30);
      state.score += 30;
      playTone(850, 0.16, "triangle", 0.14);
      createParticles(pickup.x, pickup.y, "80,255,170", 14);
    }
  }

  for (const pickup of state.bombPickups) {
    if (
      !pickup.collected &&
      circlesOverlap(
        pickup.x,
        pickup.y,
        20,
        state.player.x,
        state.player.y,
        18,
      )
    ) {
      pickup.collected = true;
      state.bombs = Math.min(5, state.bombs + 1);
      state.score += 40;
      playTone(680, 0.16, "triangle", 0.14);
      createParticles(pickup.x, pickup.y, "255,220,70", 14);
    }
  }

  for (const bridge of state.bridges) {
    if (
      !bridge.destroyed &&
      Math.abs(bridge.y - state.player.y) < bridge.height * 0.8
    ) {
      damagePlayer(35);
    }
  }

  state.waterEnemies = state.waterEnemies.filter(
    (item) => !item.destroyed && item.y < height + 100,
  );
  state.obstacles = state.obstacles.filter(
    (item) =>
      !item.destroyed &&
      item.y < height + 90 &&
      item.x > -160 &&
      item.x < width + 160,
  );
  state.fuelPickups = state.fuelPickups.filter(
    (item) => !item.collected && item.y < height + 70,
  );
  state.bombPickups = state.bombPickups.filter(
    (item) => !item.collected && item.y < height + 70,
  );
  state.bullets = state.bullets.filter(
    (item) => !item.destroyed && item.y > -40,
  );
  state.bridges = state.bridges.filter((item) => item.y < height + 90);
  state.particles = state.particles.filter((item) => item.life > 0);
  state.clouds = state.clouds.filter(
    (item) => item.y - item.size < height + 140,
  );

  state.fuel = Math.max(0, state.fuel);
  if (state.fuel <= 0) loseLife();

  updateHud();
}

function drawRiver() {
  context.fillStyle = "#34743f";
  context.fillRect(0, 0, width, height);

  context.beginPath();

  for (let y = -30; y <= height + 30; y += 22) {
    const center = riverCenter(y);
    const halfWidth = riverHalfWidth(y);

    if (y === -30) context.moveTo(center - halfWidth, y);
    else context.lineTo(center - halfWidth, y);
  }

  for (let y = height + 30; y >= -30; y -= 22) {
    const center = riverCenter(y);
    const halfWidth = riverHalfWidth(y);
    context.lineTo(center + halfWidth, y);
  }

  context.closePath();

  const riverGradient = context.createLinearGradient(0, 0, width, 0);
  riverGradient.addColorStop(0, "#245a83");
  riverGradient.addColorStop(0.5, "#3d96ca");
  riverGradient.addColorStop(1, "#245a83");

  context.fillStyle = riverGradient;
  context.fill();

  context.fillStyle = "#245d31";

  for (let y = 20; y < height; y += 58) {
    const center = riverCenter(y);
    const halfWidth = riverHalfWidth(y);

    context.beginPath();
    context.arc(center - halfWidth - 14, y, 12, 0, Math.PI * 2);
    context.arc(center + halfWidth + 14, y + 18, 12, 0, Math.PI * 2);
    context.fill();
  }

  context.strokeStyle = "rgb(255 255 255 / 20%)";
  context.lineWidth = 2;

  for (let y = (state.time * state.worldSpeed) % 48 - 48; y < height; y += 48) {
    const bounds = riverBounds(y, 14);
    context.beginPath();

    for (let x = bounds.left; x < bounds.right; x += 34) {
      context.moveTo(x, y);
      context.quadraticCurveTo(x + 8, y - 5, x + 16, y);
    }

    context.stroke();
  }
}

function drawBridge(bridge) {
  const center = riverCenter(bridge.y);
  const halfWidth = riverHalfWidth(bridge.y);

  context.fillStyle = bridge.destroyed ? "#5b4635" : "#716459";

  if (bridge.destroyed) {
    context.fillRect(
      center - halfWidth,
      bridge.y - bridge.height / 2,
      halfWidth * 0.45,
      bridge.height,
    );
    context.fillRect(
      center + halfWidth * 0.55,
      bridge.y - bridge.height / 2,
      halfWidth * 0.45,
      bridge.height,
    );
    return;
  }

  context.fillRect(
    center - halfWidth - 5,
    bridge.y - bridge.height / 2,
    halfWidth * 2 + 10,
    bridge.height,
  );

  context.fillStyle = "#40362f";
  for (let x = center - halfWidth; x < center + halfWidth; x += 26) {
    context.fillRect(x, bridge.y - bridge.height / 2, 8, bridge.height);
  }
}

function drawFuelPickup(pickup) {
  context.save();
  context.translate(pickup.x, pickup.y + Math.sin(pickup.phase) * 3);

  context.fillStyle = "#d84236";
  context.fillRect(-13, -16, 26, 32);

  context.fillStyle = "#fff";
  context.fillRect(-13, -4, 26, 8);

  context.fillStyle = "#d84236";
  context.font = "bold 11px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("F", 0, 0);

  context.fillStyle = "#222";
  context.fillRect(-4, -21, 8, 5);
  context.restore();
}

function drawBombPickup(pickup) {
  context.save();
  context.translate(pickup.x, pickup.y + Math.sin(pickup.phase) * 3);

  context.fillStyle = "#171717";
  context.beginPath();
  context.arc(0, 2, 13, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "#ffd84d";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(7, -8);
  context.quadraticCurveTo(13, -16, 18, -12);
  context.stroke();

  context.fillStyle = "#ff6b37";
  context.beginPath();
  context.arc(19, -13, 4, 0, Math.PI * 2);
  context.fill();
  context.restore();
}


function drawWaterEnemy(enemy) {
  context.save();
  context.translate(enemy.x, enemy.y);

  if (enemy.type === "submarine") {
    if (!enemy.emerged) {
      context.globalAlpha = 0.22;
      context.fillStyle = "#17364a";
      context.beginPath();
      context.ellipse(0, 2, 25, 9, 0, 0, Math.PI * 2);
      context.fill();
    } else {
      context.fillStyle = "#263b48";
      context.beginPath();
      context.ellipse(0, 4, 28, 11, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#16232c";
      context.fillRect(-4, -13, 8, 16);
      context.fillRect(0, -13, 10, 4);
      context.strokeStyle = "rgba(255,255,255,.5)";
      context.beginPath();
      context.arc(0, 5, 35 + Math.sin(enemy.phase) * 3, 0, Math.PI * 2);
      context.stroke();
    }
  } else {
    context.fillStyle = "#f1f2f3";
    context.beginPath();
    context.moveTo(0, -25);
    context.lineTo(18, 20);
    context.lineTo(-18, 20);
    context.closePath();
    context.fill();
    context.fillStyle = "#c33";
    context.fillRect(-7, -8, 14, 20);
    context.fillStyle = "#26333d";
    context.fillRect(-4, -18, 8, 12);
  }

  context.restore();
}

function drawTruck(bridge, truck) {
  if (truck.destroyed) return;
  const center = riverCenter(bridge.y);
  const x = center + truck.offsetX;

  context.save();
  context.translate(x, bridge.y);
  context.scale(truck.direction, 1);
  context.fillStyle = "#e48b24";
  context.fillRect(-18, -9, 28, 18);
  context.fillStyle = "#d5dbe0";
  context.fillRect(10, -7, 11, 14);
  context.fillStyle = "#18232b";
  context.beginPath();
  context.arc(-10, 10, 4, 0, Math.PI * 2);
  context.arc(14, 10, 4, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawObstacle(obstacle) {
  context.save();
  context.translate(obstacle.x, obstacle.y);

  if (obstacle.type === "bird") {
    context.strokeStyle = "#1e2024";
    context.lineWidth = 6;
    context.beginPath();
    context.moveTo(-obstacle.size, Math.sin(obstacle.phase) * 6);
    context.quadraticCurveTo(
      0,
      -10,
      obstacle.size,
      Math.sin(obstacle.phase) * 6,
    );
    context.stroke();
  } else if (obstacle.type === "glider") {
    context.fillStyle = "#ffcf45";
    context.beginPath();
    context.moveTo(0, -15);
    context.lineTo(-obstacle.size, 12);
    context.lineTo(obstacle.size, 12);
    context.closePath();
    context.fill();
  } else if (obstacle.type === "airplane") {
    context.rotate(obstacle.velocityX > 0 ? Math.PI / 2 : -Math.PI / 2);
    context.fillStyle = "#d95042";
    context.beginPath();
    context.moveTo(0, -24);
    context.lineTo(8, 12);
    context.lineTo(-8, 12);
    context.closePath();
    context.fill();
    context.fillStyle = "#f5d16c";
    context.fillRect(-26, -1, 52, 8);
    context.fillStyle = "#273847";
    context.beginPath();
    context.ellipse(0, -9, 4, 8, 0, 0, Math.PI * 2);
    context.fill();
  } else if (obstacle.type === "helicopter") {
    context.fillStyle = "#4c5966";
    context.beginPath();
    context.ellipse(0, 3, 22, 11, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#70b9d8";
    context.beginPath();
    context.ellipse(7, 0, 8, 6, 0, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "#202830";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(-28, -10);
    context.lineTo(28, -10);
    context.stroke();

    context.beginPath();
    context.moveTo(-27, 0);
    context.lineTo(-40, -7);
    context.stroke();
  } else {
    context.fillStyle = "#b9e8ff";
    context.beginPath();
    context.ellipse(0, 4, 30, 11, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#5ad1ff";
    context.beginPath();
    context.arc(0, -3, 13, Math.PI, 0);
    context.fill();

    context.strokeStyle = "#fff";
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(0, 4, 30, 11, 0, 0, Math.PI * 2);
    context.stroke();
  }

  context.restore();
}

function drawPlayer() {
  if (!running) return;

  const blink =
    state.player.invulnerable > 0 &&
    Math.floor(state.player.invulnerable * 18) % 2 === 1;

  context.save();
  context.translate(state.player.x, state.player.y);
  context.rotate(state.player.tilt);
  context.globalAlpha = blink ? 0.45 : 1;

  context.shadowColor = "rgba(0,0,0,.42)";
  context.shadowBlur = 14;
  context.shadowOffsetY = 9;

  const yellow = context.createLinearGradient(0, -36, 0, 27);
  yellow.addColorStop(0, "#ffe176");
  yellow.addColorStop(0.45, "#f4ad25");
  yellow.addColorStop(1, "#c96f10");

  context.fillStyle = yellow;
  context.beginPath();
  context.moveTo(0, -37);
  context.quadraticCurveTo(11, -27, 10, 19);
  context.quadraticCurveTo(5, 28, 0, 29);
  context.quadraticCurveTo(-5, 28, -10, 19);
  context.quadraticCurveTo(-11, -27, 0, -37);
  context.fill();

  context.fillStyle = "#efaa28";
  context.beginPath();
  context.moveTo(-41, 1);
  context.lineTo(41, 1);
  context.lineTo(29, 14);
  context.lineTo(-29, 14);
  context.closePath();
  context.fill();

  context.strokeStyle = "#9e570c";
  context.lineWidth = 1.5;
  context.stroke();

  context.fillStyle = "#e89517";
  context.beginPath();
  context.moveTo(-17, 18);
  context.lineTo(17, 18);
  context.lineTo(10, 27);
  context.lineTo(-10, 27);
  context.closePath();
  context.fill();

  context.fillStyle = "#2d8ec0";
  context.beginPath();
  context.ellipse(0, -14, 6, 11, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "rgba(190,235,255,.7)";
  context.beginPath();
  context.ellipse(-1, -17, 2.5, 5, -0.2, 0, Math.PI * 2);
  context.fill();

  context.shadowBlur = 0;
  context.save();
  context.translate(0, -36);
  context.rotate(state.time * 30);
  context.strokeStyle = "rgba(45,45,45,.75)";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(-18, 0);
  context.lineTo(18, 0);
  context.stroke();
  context.restore();

  context.restore();
}
function drawCloud(cloud) {
  context.save();
  context.globalAlpha = cloud.alpha;
  context.fillStyle = "#fff";
  context.shadowColor = "rgb(255 255 255 / 90%)";
  context.shadowBlur = 25;

  context.beginPath();
  context.arc(cloud.x, cloud.y, cloud.size * 0.42, 0, Math.PI * 2);
  context.arc(
    cloud.x + cloud.size * 0.35,
    cloud.y + 10,
    cloud.size * 0.35,
    0,
    Math.PI * 2,
  );
  context.arc(
    cloud.x - cloud.size * 0.34,
    cloud.y + 14,
    cloud.size * 0.31,
    0,
    Math.PI * 2,
  );
  context.arc(
    cloud.x + cloud.size * 0.05,
    cloud.y - cloud.size * 0.18,
    cloud.size * 0.36,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();
}

function draw() {
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);

  if (state.shake > 0) {
    context.translate(
      (Math.random() - 0.5) * 8 * state.shake,
      (Math.random() - 0.5) * 8 * state.shake,
    );
  }

  drawRiver();

  for (const bridge of state.bridges) {
    drawBridge(bridge);
    for (const truck of bridge.trucks || []) drawTruck(bridge, truck);
  }
  for (const pickup of state.fuelPickups) drawFuelPickup(pickup);
  for (const pickup of state.bombPickups) drawBombPickup(pickup);
  for (const enemy of state.waterEnemies) drawWaterEnemy(enemy);
  for (const obstacle of state.obstacles) drawObstacle(obstacle);

  context.strokeStyle = "#ffe76d";
  context.lineWidth = 3;
  for (const bullet of state.bullets) {
    context.beginPath();
    context.moveTo(bullet.x, bullet.y);
    context.lineTo(bullet.x, bullet.y + 12);
    context.stroke();
  }

  for (const particle of state.particles) {
    const alpha = Math.max(0, particle.life / particle.maxLife);
    context.fillStyle = `rgba(${particle.color},${alpha})`;
    context.beginPath();
    context.arc(
      particle.x,
      particle.y,
      particle.size * alpha,
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  drawPlayer();

  for (const cloud of state.clouds) drawCloud(cloud);
}

function gameLoop(currentTime) {
  const delta = Math.min(
    CONFIG.maxDelta,
    Math.max(0, (currentTime - previousTime) / 1000),
  );
  previousTime = currentTime;

  update(delta);
  draw();
  requestAnimationFrame(gameLoop);
}

function setPointerTarget(event) {
  const bounds = canvas.getBoundingClientRect();
  state.player.targetX = event.clientX - bounds.left;
  state.player.targetY = event.clientY - bounds.top;
}

canvas.addEventListener("pointerdown", (event) => {
  pointerActive = true;
  canvas.setPointerCapture?.(event.pointerId);
  if (running) setPointerTarget(event);
});

canvas.addEventListener("pointermove", (event) => {
  if (pointerActive && running) setPointerTarget(event);
});

canvas.addEventListener("pointerup", () => {
  pointerActive = false;
});

canvas.addEventListener("pointercancel", () => {
  pointerActive = false;
});

addEventListener("keydown", (event) => {
  if (
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(
      event.code,
    )
  ) {
    event.preventDefault();
  }

  pressedKeys.add(event.code);

  if (event.code === "Space" && running) firing = true;
  if (event.code === "KeyB" && running && !event.repeat) useBomb();
});

addEventListener("keyup", (event) => {
  pressedKeys.delete(event.code);
  if (event.code === "Space") firing = false;
});

elements.playButton.addEventListener("click", startGame);
elements.restartButton.addEventListener("click", startGame);
elements.fireButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  mobileFiring = true;
  fire();
});
elements.fireButton.addEventListener("pointerup", () => {
  mobileFiring = false;
});
elements.fireButton.addEventListener("pointercancel", () => {
  mobileFiring = false;
});
elements.fireButton.addEventListener("pointerleave", () => {
  mobileFiring = false;
});
elements.bombButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  useBomb();
});

elements.soundButton.addEventListener("click", () => {
  soundMuted = !soundMuted;
  elements.soundButton.textContent = soundMuted ? "🔇" : "🔊";

  if (soundMuted) stopEngineSound();
  else if (running) startEngineSound();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) { firing = false; mobileFiring = false; stopEngineSound(); }
  else if (running && !soundMuted) startEngineSound();
});

addEventListener("resize", resizeCanvas);

elements.record.textContent = record ? `Recorde: ${record}` : "";
resizeCanvas();
updateHud();
requestAnimationFrame(gameLoop);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {
    // O jogo continua funcionando mesmo sem service worker.
  });
}
