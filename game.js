// 音频文件URL
const AUDIO_FILES = {
  backgroundMusic: '/path/to/background-music.mp3',
  jump: '/path/to/jump-sound.mp3',
  land: '/path/to/land-sound.mp3',
  collect: '/path/to/collect-sound.mp3',
  gameOver: '/path/to/game-over-sound.mp3'
};

// 游戏状态
let gameState = 'start';
let score = 0;
let level = 1;
let lives = 9;
let timeLeft = 30;
let discoveredActions = new Set();
let isMuted = false;

// 音频上下文
let audioContext = null;
let audioBuffers = {};
let backgroundMusicSource = null;

// 画布和上下文
let canvas, ctx;

// 玩家对象
const player = {
  x: 100,
  y: 200,
  width: 30,
  height: 40,
  speedX: 0,
  speedY: 0,
  isJumping: false,
  canDoubleJump: true,
  isRunning: false,
  isCrouching: false,
  isWallSliding: false,
  facing: 'right',
  color: '#4A90E2',
  jumpCount: 0,
  dashCooldown: 0,
  wallJumpCooldown: 0
};

// 游戏状态
const state = {
  particles: [],
  lastAction: '',
  comboTimer: 0,
  comboActions: [],
  currentHint: ''
};

// 关卡设计
const levels = [
  {
    platforms: [
      { x: 300, y: 300, width: 200, height: 20 },
      { x: 550, y: 200, width: 100, height: 20 }
    ],
    requiredActions: ['JUMP', 'SPRINT'],
    hint: "尝试跳跃(↑)和冲刺(Shift)!"
  },
  {
    platforms: [
      { x: 200, y: 300, width: 100, height: 20 },
      { x: 400, y: 250, width: 100, height: 20 },
      { x: 600, y: 200, width: 100, height: 20 }
    ],
    requiredActions: ['DOUBLE_JUMP', 'WALL_JUMP'],
    hint: "尝试二段跳(空中再按↑)和墙壁跳跃!"
  },
  // ... 其他关卡 ...
];

// 动作定义
const actions = {
  'JUMP': '跳跃',
  'DOUBLE_JUMP': '二段跳',
  'SPRINT': '冲刺',
  'CROUCH': '蹲下',
  'SLIDE': '滑行',
  'WALL_JUMP': '墙壁跳跃',
  'COMBO_SPRINT_JUMP': '冲刺跳跃',
  'COMBO_CROUCH_SLIDE': '下蹲滑行',
  'DASH': '冲刺位移',
  'AIR_DIVE': '空中俯冲',
  'WALL_SLIDE': '墙壁滑行',
  'BACKFLIP': '后空翻'
};

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = Math.random() * 5 + 2;
    this.speedX = (Math.random() - 0.5) * 8;
    this.speedY = (Math.random() - 0.5) * 8;
    this.life = 1;
    this.decay = Math.random() * 0.02 + 0.02;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.life -= this.decay;
    this.size *= 0.95;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.life;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function createEffect(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    state.particles.push(new Particle(x, y, color));
  }
}

function handleInput(e) {
  if (gameState !== 'playing') return;

  if (e.key === 'ArrowLeft') {
    player.speedX = -5;
    player.facing = 'left';
  } else if (e.key === 'ArrowRight') {
    player.speedX = 5;
    player.facing = 'right';
  } else if (e.key === 'Shift') {
    if (!player.isRunning) {
      createEffect(player.x, player.y, '#FFD700');
    }
    player.isRunning = true;
    player.speedX *= 1.8;
    checkAction('SPRINT');
  } else if (e.key === 'ArrowUp') {
    if (!player.isJumping) {
      player.speedY = -12;
      player.isJumping = true;
      player.jumpCount = 1;
      createEffect(player.x, player.y, '#87CEEB');
      checkAction('JUMP');
      playSound('jump');
    } else if (player.canDoubleJump && player.jumpCount === 1) {
      player.speedY = -10;
      player.jumpCount = 2;
      player.canDoubleJump = false;
      createEffect(player.x, player.y, '#FF69B4');
      checkAction('DOUBLE_JUMP');
      playSound('jump');
    }
  } else if (e.key === 'z' && player.dashCooldown <= 0) {
    const dashSpeed = player.facing === 'right' ? 20 : -20;
    player.speedX = dashSpeed;
    player.dashCooldown = 30;
    createEffect(player.x, player.y, '#FF1493');
    checkAction('DASH');
  } else if (e.key === 'ArrowDown' && player.isJumping) {
    player.speedY = 15;
    createEffect(player.x, player.y, '#9400D3');
    checkAction('AIR_DIVE');
  }

  checkComboActions();
}

function handleKeyUp(e) {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    player.speedX = 0;
  } else if (e.key === 'Shift') {
    player.isRunning = false;
  }
}

function checkComboActions() {
  if (player.isRunning && player.isJumping) {
    checkAction('COMBO_SPRINT_JUMP');
  }
  if (player.isCrouching && Math.abs(player.speedX) > 0) {
    checkAction('COMBO_CROUCH_SLIDE');
  }
  if (player.isJumping && player.speedX < 0 && player.facing === 'left') {
    checkAction('BACKFLIP');
  }
}

function checkAction(actionName) {
  if (!discoveredActions.has(actionName)) {
    discoveredActions.add(actionName);
    score += 100;
    timeLeft = 30; // Reset the timer when a new action is discovered
    playSound('collect');
    updateUI();
    checkLevelCompletion();
  }
}

function checkLevelCompletion() {
  const currentLevel = levels[level - 1];
  const requiredActions = currentLevel.requiredActions;
  if (requiredActions.every(action => discoveredActions.has(action))) {
    level++;
    if (level <= levels.length) {
      player.x = 100;
      player.y = 200;
      playSound('collect');
      updateUI();
    } else {
      endGame(true);
    }
  }
}

function update() {
  // Update cooldowns
  if (player.dashCooldown > 0) player.dashCooldown--;
  if (player.wallJumpCooldown > 0) player.wallJumpCooldown--;

  // Apply gravity
  player.speedY += 0.6;
  
  // Update position
  player.x += player.speedX;
  player.y += player.speedY;

  // Check platform collisions
  const currentLevel = levels[level - 1];
  let onGround = false;
  player.isWallSliding = false;

  // Ground collision
  if (player.y > 600 - player.height) {
    player.y = 600 - player.height;
    player.speedY = 0;
    player.isJumping = false;
    player.canDoubleJump = true;
    onGround = true;
    playSound('land');
  }

  // Platform collisions
  for (let platform of currentLevel.platforms) {
    if (checkCollision(player, platform)) {
      // Collision from above
      if (player.speedY > 0 && player.y + player.height - player.speedY <= platform.y) {
        player.y = platform.y - player.height;
        player.speedY = 0;
        player.isJumping = false;
        player.canDoubleJump = true;
        onGround = true;
        playSound('land');
      }
      // Wall collision
      else if (player.speedX !== 0) {
        if (player.x < platform.x) {
          player.x = platform.x - player.width;
          player.isWallSliding = true;
        } else {
          player.x = platform.x + platform.width;
          player.isWallSliding = true;
        }
      }
    }
  }

  // Wall sliding
  if (player.isWallSliding) {
    player.speedY = Math.min(player.speedY, 2);
    checkAction('WALL_SLIDE');
  }

  // Boundary check
  if (player.x < 0) player.x = 0;
  if (player.x > 800 - player.width) player.x = 800 - player.width;

  // Update particles
  state.particles = state.particles.filter(particle => {
    particle.update();
    return particle.life > 0;
  });
}

function checkCollision(rect1, rect2) {
  const scaledRect1 = {
    x: rect1.x / 800 * canvas.width,
    y: rect1.y / 600 * canvas.height,
    width: rect1.width / 800 * canvas.width,
    height: rect1.height / 600 * canvas.height
  };
  const scaledRect2 = {
    x: rect2.x / 800 * canvas.width,
    y: rect2.y / 600 * canvas.height,
    width: rect2.width / 800 * canvas.width,
    height: rect2.height / 600 * canvas.height
  };
  return scaledRect1.x < scaledRect2.x + scaledRect2.width &&
         scaledRect1.x + scaledRect1.width > scaledRect2.x &&
         scaledRect1.y < scaledRect2.y + scaledRect2.height &&
         scaledRect1.y + scaledRect1.height > scaledRect2.y;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 绘制黑色背景
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 绘制当前关卡的平台
  ctx.fillStyle = '#4CAF50';
  const currentLevel = levels[level - 1];
  for (let platform of currentLevel.platforms) {
    // 根据画布大小调整平台位置和大小
    const scaledPlatform = {
      x: platform.x / 800 * canvas.width,
      y: platform.y / 600 * canvas.height,
      width: platform.width / 800 * canvas.width,
      height: platform.height / 600 * canvas.height
    };
    ctx.fillRect(scaledPlatform.x, scaledPlatform.y, scaledPlatform.width, scaledPlatform.height);
  }

  // 绘制粒子
  state.particles.forEach(particle => {
    // 根据画布大小调整粒子位置和大小
    const scaledParticle = {
      x: particle.x / 800 * canvas.width,
      y: particle.y / 600 * canvas.height,
      size: particle.size / 800 * canvas.width
    };
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = particle.life;
    ctx.beginPath();
    ctx.arc(scaledParticle.x, scaledParticle.y, scaledParticle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // 绘制玩家
  ctx.fillStyle = player.color;
  const scaledPlayer = {
    x: player.x / 800 * canvas.width,
    y: player.y / 600 * canvas.height,
    width: player.width / 800 * canvas.width,
    height: player.height / 600 * canvas.height
  };
  ctx.fillRect(scaledPlayer.x, scaledPlayer.y, scaledPlayer.width, scaledPlayer.height);

  // 绘制玩家面部方向
  ctx.fillStyle = '#333';
  const eyeX = player.facing === 'right' ? scaledPlayer.x + scaledPlayer.width * 0.75 : scaledPlayer.x + scaledPlayer.width * 0.25;
  ctx.fillRect(eyeX, scaledPlayer.y + scaledPlayer.height * 0.25, scaledPlayer.width * 0.15, scaledPlayer.height * 0.15);
}

function updateUI() {
  document.getElementById('score').textContent = score;
  document.getElementById('level').textContent = level;
  document.getElementById('lives').textContent = lives;
  document.getElementById('timeLeft').textContent = timeLeft;
  document.getElementById('discoveredActions').innerHTML = Array.from(discoveredActions)
    .map(action => `<span class="action">${actions[action]}</span>`)
    .join('');
  document.getElementById('currentHint').textContent = levels[level - 1].hint;
}

function startGame() {
  gameState = 'playing';
  score = 0;
  level = 1;
  lives =   9;
  timeLeft = 30;
  discoveredActions.clear();
  player.x = 100;
  player.y = 200;
  initAudio();
  playBackgroundMusic();
  updateUI();
  gameLoop();
}

function endGame(completed) {
  gameState = 'gameOver';
  stopBackgroundMusic();
  playSound('gameOver');
  document.getElementById('finalScore').textContent = score;
  document.getElementById('finalLevel').textContent = level;
  document.getElementById('gameOverScreen').style.display = 'flex';
}

function gameLoop() {
  if (gameState !== 'playing') return;

  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// 音频相关函数
function initAudio() {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  Object.entries(AUDIO_FILES).forEach(([key, url]) => {
    fetch(url)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        audioBuffers[key] = audioBuffer;
      });
  });
}

function playSound(soundName) {
  if (isMuted || !audioContext || !audioBuffers[soundName]) return;
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffers[soundName];
  source.connect(audioContext.destination);
  source.start();
}

function playBackgroundMusic() {
  if (isMuted || !audioContext || !audioBuffers['backgroundMusic']) return;
  backgroundMusicSource = audioContext.createBufferSource();
  backgroundMusicSource.buffer = audioBuffers['backgroundMusic'];
  backgroundMusicSource.connect(audioContext.destination);
  backgroundMusicSource.loop = true;
  backgroundMusicSource.start();
}

function stopBackgroundMusic() {
  if (backgroundMusicSource) {
    backgroundMusicSource.stop();
    backgroundMusicSource = null;
  }
}

function toggleMute() {
  isMuted = !isMuted;
  if (isMuted) {
    stopBackgroundMusic();
  } else {
    playBackgroundMusic();
  }
  document.getElementById('muteButton').textContent = isMuted ? '开启声音' : '关闭声音';
}

// 初始化游戏
window.addEventListener('load', () => {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  window.addEventListener('keydown', handleInput);
  window.addEventListener('keyup', handleKeyUp);

  document.getElementById('startButton').addEventListener('click', startGame);
  document.getElementById('restartButton').addEventListener('click', startGame);
  document.getElementById('muteButton').addEventListener('click', toggleMute);

  // 开始游戏计时器
  setInterval(() => {
    if (gameState === 'playing') {
      timeLeft--;
      if (timeLeft <= 0) {
        lives--;
        if (lives <= 0) {
          endGame(false);
        } else {
          timeLeft = 30;
        }
      }
      updateUI();
    }
  }, 1000);
});
