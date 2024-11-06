const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
g_scaleFactor = 1;
let canvasWidth = 800;
let canvasHeight = 400;
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const livesElement = document.getElementById('lives');
const timeLeftElement = document.getElementById('timeLeft');
const discoveredActionsElement = document.getElementById('discoveredActions');
const actionHintElement = document.getElementById('actionHint');
const currentHintElement = document.getElementById('currentHint');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const finalScoreElement = document.getElementById('finalScore');
const finalLevelElement = document.getElementById('finalLevel');

// 游戏状态
const state = {
    score: 0,
    level: 1,
    lives: 9,
    timeLeft: 30,
    discoveredActions: new Set(),
    particles: [],
    lastAction: '',
    comboTimer: 0,
    comboActions: [],
    currentHint: '',
    gameState: 'start' // 'start', 'playing', 'gameOver'
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
    {
        platforms: [
            { x: 200, y: 300, width: 400, height: 20 },
            { x: 650, y: 200, width: 50, height: 200 },
            { x: 100, y: 200, width: 50, height: 200 }, // 添加一个新的垂直平台
            { x: 300, y: 150, width: 200, height: 20 }  // 添加一个新的水平平台
        ],
        requiredActions: ['SLIDE', 'WALL_SLIDE'],
        hint: "尝试滑行(跑动时按↓)和墙壁滑行!提示：利用新增的平台练习墙壁滑行。"
    },
    {
        platforms: [
            { x: 200, y: 300, width: 100, height: 20 },
            { x: 400, y: 200, width: 100, height: 20 },
            { x: 600, y: 100, width: 100, height: 20 },
            { x: 750, y: 350, width: 50, height: 50 }
        ],
        requiredActions: ['COMBO_SPRINT_JUMP', 'AIR_DIVE'],
        hint: "尝试冲刺跳跃和空中俯冲(跳跃时按↓)!"
    },
    {
        platforms: [
            { x: 200, y: 350, width: 50, height: 50 },
            { x: 300, y: 300, width: 50, height: 100 },
            { x: 400, y: 250, width: 50, height: 150 },
            { x: 500, y: 200, width: 50, height: 200 },
            { x: 600, y: 150, width: 50, height: 250 },
            { x: 700, y: 100, width: 50, height: 300 }
        ],
        requiredActions: ['WALL_JUMP', 'DASH'],
        hint: "使用墙壁跳跃和冲刺(Z键)来攀登!"
    },
    {
        platforms: [
            { x: 100, y: 350, width: 600, height: 20 },
            { x: 300, y: 250, width: 200, height: 20 },
            { x: 600, y: 150, width: 100, height: 20 }
        ],
        requiredActions: ['BACKFLIP', 'DOUBLE_JUMP'],
        hint: "尝试后空翻(向后跑时跳跃)和二段跳的组合!"
    },
    {
        platforms: [
            { x: 100, y: 350, width: 100, height: 20 },
            { x: 300, y: 300, width: 100, height: 20 },
            { x: 500, y: 250, width: 100, height: 20 },
            { x: 700, y: 200, width: 100, height: 20 },
            { x: 200, y: 150, width: 400, height: 20 }
        ],
        requiredActions: ['COMBO_SPRINT_JUMP', 'WALL_JUMP', 'AIR_DIVE'],
        hint: "组合使用冲刺跳跃、墙壁跳跃和空中俯冲!"
    },
    {
        platforms: [
            { x: 100, y: 350, width: 50, height: 50 },
            { x: 250, y: 300, width: 50, height: 50 },
            { x: 400, y: 250, width: 50, height: 50 },
            { x: 550, y: 200, width: 50, height: 50 },
            { x: 700, y: 150, width: 50, height: 50 }
        ],
        requiredActions: ['DASH', 'DOUBLE_JUMP', 'WALL_JUMP'],
        hint: "使用冲刺、二段跳和墙壁跳跃的组合来通过这个挑战!"
    },
    {
        platforms: [
            { x: 100, y: 350, width: 600, height: 20 },
            { x: 100, y: 150, width: 20, height: 200 },
            { x: 300, y: 150, width: 20, height: 200 },
            { x: 500, y: 150, width: 20, height: 200 },
            { x: 700, y: 150, width: 20, height: 200 }
        ],
        requiredActions: ['WALL_SLIDE', 'WALL_JUMP', 'DASH', 'AIR_DIVE'],
        hint: "在狭窄的空间中使用墙壁滑行、墙壁跳跃、冲刺和空中俯冲!"
    },
    {
        platforms: [
            { x: 100, y: 350, width: 100, height: 20 },
            { x: 300, y: 300, width: 100, height: 20 },
            { x: 500, y: 250, width: 100, height: 20 },
            { x: 700, y: 200, width: 100, height: 20 },
            { x: 200, y: 150, width: 100, height: 20 },
            { x: 400, y: 100, width: 100, height: 20 },
            { x: 600, y: 50, width: 100, height: 20 }
        ],
        requiredActions: ['COMBO_SPRINT_JUMP', 'DOUBLE_JUMP', 'WALL_JUMP', 'DASH', 'AIR_DIVE', 'BACKFLIP'],
        hint: "最终挑战！使用所有学到的技能来完成这个关卡!"
    }
];

function resizeCanvas() {
    const container = document.getElementById('gameContainer');
    const containerWidth = container.clientWidth;
    canvasWidth = containerWidth;
    canvasHeight = containerWidth / 2; // Maintain 2:1 aspect ratio
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Adjust game elements based on new canvas size
    adjustGameElements();
}

function adjustGameElements() {
    // Adjust player size and position
    scaleFactor = canvasWidth / 800; // 800 is the original width
    g_scaleFactor = scaleFactor;
    player.width = 30 * scaleFactor;
    player.height = 40 * scaleFactor;
    player.x = player.x * scaleFactor;
    player.y = player.y * scaleFactor;

    // Adjust platforms
    levels.forEach(level => {
        level.platforms.forEach(platform => {
            platform.x *= scaleFactor;
            platform.y *= scaleFactor;
            platform.width *= scaleFactor;
            platform.height *= scaleFactor;
        });
    });

    // You may need to adjust other game elements here
}


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


// 特效粒子系统
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

// 创建特效
function createEffect(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        state.particles.push(new Particle(x, y, color));
    }
}

const keys = {};

document.addEventListener('keydown', function(e) {
    keys[e.key] = true;
    handleInput();
});

document.addEventListener('keyup', function(e) {
    keys[e.key] = false;
    handleInput();
});

function showActionHint(text) {
    actionHintElement.textContent = text;
    actionHintElement.style.display = 'block';
    setTimeout(() => {
        actionHintElement.style.display = 'none';
    }, 2000);
}

function handleInput() {
    if (state.gameState !== 'playing') return;

    // 基础移动
    player.speedX = 0;
    if (keys['ArrowLeft']) {
        player.speedX = -5 * g_scaleFactor;
        player.facing = 'left';
    }
    if (keys['ArrowRight']) {
        player.speedX = 5 * g_scaleFactor;
        player.facing = 'right';
    }

    // 冲刺
    if (keys['Shift']) {
        if (!player.isRunning) {
            createEffect(player.x, player.y, '#FFD700');
        }
        player.isRunning = true;
        player.speedX *= 1.8;
        checkAction('SPRINT');
    } else {
        player.isRunning = false;
    }

    // 跳跃系统
    if (keys['ArrowUp']) {
        if (!player.isJumping) {
            console.log("jump");
            player.speedY = -12 * g_scaleFactor;
            player.isJumping = true;
            player.jumpCount = 1;
            createEffect(player.x, player.y, '#87CEEB');
            checkAction('JUMP');
        } else if (player.canDoubleJump && player.jumpCount === 1) {
            console.log("double jump");
            player.speedY = -10 * g_scaleFactor;
            player.jumpCount = 2;
            player.canDoubleJump = false;
            createEffect(player.x, player.y, '#FF69B4');
            checkAction('DOUBLE_JUMP');
        }
    }

    // 墙壁跳跃
    if (player.isWallSliding && keys['ArrowUp'] && player.wallJumpCooldown <= 0) {
        player.speedY = -12 * g_scaleFactor;
        player.speedX = player.facing === 'right' ? -15 : 15;
        player.wallJumpCooldown = 20;
        createEffect(player.x, player.y, '#FF4500');
        checkAction('WALL_JUMP');
    }

    // 冲刺位移
    if (keys['z'] && player.dashCooldown <= 0) {
        const dashSpeed = player.facing === 'right' ? 20 : -20;
        player.speedX = dashSpeed;
        player.dashCooldown = 30;
        createEffect(player.x, player.y, '#FF1493');
        checkAction('DASH');
    }

    // 空中俯冲
    if (keys['ArrowDown'] && player.isJumping) {
        player.speedY = 15 * g_scaleFactor;
        createEffect(player.x, player.y, '#9400D3');
        checkAction('AIR_DIVE');
    }
    // 滑行检测
    if (keys['ArrowDown'] && Math.abs(player.speedX) > 0 && !player.isJumping) {
        player.isCrouching = true;
        checkAction('SLIDE');
    } else {
        player.isCrouching = false;
    }

    // 墙壁滑行检测
    if (player.isWallSliding) {
        checkAction('WALL_SLIDE');
    }


    checkComboActions();
}

function checkComboActions() {
    // 现有的组合动作检测
    if (player.isRunning && player.isJumping) {
        checkAction('COMBO_SPRINT_JUMP');
    }
    if (player.isCrouching && Math.abs(player.speedX) > 0) {
        checkAction('COMBO_CROUCH_SLIDE');
    }

    // 后空翻
    if (player.isJumping && player.speedX < 0 && keys['ArrowUp']) {
        checkAction('BACKFLIP');
    }
}

function checkAction(actionName) {
    createEffect(player.x, player.y, '#FFA500', 20); // existing effect creation

    if (actionName === 'SLIDE') {
        createEffect(player.x, player.y + player.height - 5, '#FFA500', 20);
    } else if (actionName === 'WALL_SLIDE') {
        createEffect(player.x + (player.facing === 'right' ? player.width : 0), player.y, '#8A2BE2', 20);
    }
    if (!state.discoveredActions.has(actionName)) {
        state.discoveredActions.add(actionName);
        state.score += 100;
        state.timeLeft = 30; // 重置时间
        scoreElement.textContent = state.score;
        updateDiscoveredActions();
        showActionHint(`发现新动作: ${actions[actionName]}! +100分`);
        checkLevelCompletion();
    }
}

function checkLevelCompletion() {
    const currentLevel = levels[state.level - 1];
    const requiredActions = currentLevel.requiredActions;
    console.log("Required actions:", requiredActions);
    console.log("Discovered actions:", Array.from(state.discoveredActions));
    
    if (requiredActions.every(action => state.discoveredActions.has(action))) {
        console.log("Level completed!");
        state.level++;
        if (state.level <= levels.length) {
            levelElement.textContent = state.level;
            showActionHint(`完成关卡 ${state.level - 1}!`);
            currentHintElement.textContent = levels[state.level - 1].hint;
            player.x = 100;
            player.y = 200;
        } else {
            endGame(true); // 通过所有关卡
        }
    } else {
        console.log("Level not completed yet.");
    }
}

function update()   {
    if (state.gameState !== 'playing') return;

    // 更新冷却时间
    if (player.dashCooldown > 0) player.dashCooldown--;
    if (player.wallJumpCooldown > 0) player.wallJumpCooldown--;

    // 应用重力
    player.speedY += 0.4 * g_scaleFactor;
    
    // 更新位置
    player.x += player.speedX;
    player.y += player.speedY;

    // 检查平台碰撞
    const currentLevel = levels[state.level - 1];
    let onGround = false;
    player.isWallSliding = false;
    if (player.x < 0) player.x = 0;
    if (player.x > canvasWidth - player.width) player.x = canvasWidth - player.width;
    if (player.y > canvasHeight - player.height) {
        player.y = canvasHeight - player.height;
        player.speedY = 0;
        player.isJumping = false;
        player.canDoubleJump = true;
    }

    // 地面碰撞
    if (player.y > canvas.height - player.height) {
        player.y = canvas.height - player.height;
        player.speedY = 0;
        player.isJumping = false;
        player.canDoubleJump = true;
        onGround = true;
    }

    // 平台碰撞
    for (let platform of currentLevel.platforms) {
        if (checkCollision(player, platform)) {
            // 从上方碰撞
            if (player.speedY > 0 && player.y + player.height - player.speedY <= platform.y) {
                player.y = platform.y - player.height;
                player.speedY = 0;
                player.isJumping = false;
                player.canDoubleJump = true;
                onGround = true;
            }
            // 墙壁碰撞
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

    // 墙壁滑行
    if (player.isWallSliding) {
        player.speedY = Math.min(player.speedY, 2);
        checkAction('WALL_SLIDE');
    }

    // 边界检查
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;

    // 更新粒子
    state.particles = state.particles.filter(particle => {
        particle.update();
        return particle.life > 0;
    });
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function draw() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 绘制当前关卡的平台
    ctx.fillStyle = '#4CAF50';
    const currentLevel = levels[state.level - 1];
    for (let platform of currentLevel.platforms) {
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    }

    // 绘制地面
    ctx.fillRect(0, canvas.height - 10, canvas.width, 10);

    // 绘制粒子
    state.particles.forEach(particle => particle.draw(ctx));

    // 绘制玩家
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // 绘制玩家面部方向
    ctx.fillStyle = '#333';
    const eyeX = player.facing === 'right' ? player.x + 20 : player.x + 5;
    ctx.fillRect(eyeX, player.y + 10, 5, 5);
}

function updateDiscoveredActions() {
    discoveredActionsElement.innerHTML = '';
    state.discoveredActions.forEach(action => {
        const actionDiv = document.createElement('div');
        actionDiv.textContent = `${actions[action]} (+100分)`;
        discoveredActionsElement.appendChild(actionDiv);
    });
}

function startGame() {
    state.gameState = 'playing';
    state.score = 0;
    state.level = 1;
    state.lives = 9;
    state.timeLeft = 30;
    state.discoveredActions.clear();
    player.x = canvasWidth * 0.125; // 100 / 800 = 0.125
    player.y = canvasHeight * 0.5; // 200 / 400 = 0.5
    updateUI();
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    gameLoop();
    startTimer();
}

function checkLevelCompletion() {
    const currentLevel = levels[state.level - 1];
    const requiredActions = currentLevel.requiredActions;
    if (requiredActions.every(action => state.discoveredActions.has(action))) {
        state.level++;
        if (state.level <= levels.length) {
            levelElement.textContent = state.level;
            showActionHint(`完成关卡 ${state.level - 1}!`);
            currentHintElement.textContent = levels[state.level - 1].hint;
            player.x = 100;
            player.y = 200;
        } else {
            endGame(true); // 通过所有关卡
        }
    }
}

function endGame(completed = false) {
    state.gameState = 'gameOver';
    finalScoreElement.textContent = state.score;
    finalLevelElement.textContent = state.level;
    const gameOverMessage = completed ? "恭喜你通关了所有关卡！" : "游戏结束";
    document.getElementById('gameOverMessage').textContent = gameOverMessage;
    gameOverScreen.style.display = 'flex';
}

function updateUI() {
    scoreElement.textContent = state.score;
    levelElement.textContent = state.level;
    livesElement.textContent = state.lives;
    timeLeftElement.textContent = state.timeLeft;
    currentHintElement.textContent = levels[state.level - 1].hint;
}

function startTimer() {
    const timer = setInterval(() => {
        if (state.gameState !== 'playing') {
            clearInterval(timer);
            return;
        }
        state.timeLeft--;
        timeLeftElement.textContent = state.timeLeft;
        if (state.timeLeft <= 0) {
            state.lives--;
            livesElement.textContent = state.lives;
            if (state.lives <= 0) {
                endGame();
            } else {
                state.timeLeft = 30;
            }
        }
    }, 1000);
}

function gameLoop() {
    if (state.gameState === 'playing') {
        update();
        draw();
        updateUI();
        requestAnimationFrame(gameLoop);
    }
}

// Call resizeCanvas initially and on window resize
resizeCanvas();

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
window.addEventListener('resize', resizeCanvas);

// 初始化提示
currentHintElement.textContent = levels[0].hint;
