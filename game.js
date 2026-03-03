// 游戏配置
const config = {
    type: Phaser.WEBGL,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1920,
        height: 1080,
        parent: 'game-container'
    },
    backgroundColor: '#1a1d2e',
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 1.2 },
            debug: false,
            enableSleeping: true
        }
    },
    scene: {
        create: create,
        update: update
    },
    fps: {
        target: 60,
        forceSetTimeOut: false
    },
    render: {
        antialias: false,
        pixelArt: false,
        roundPixels: true
    }
};

const game = new Phaser.Game(config);

// 游戏变量
let player;
let playerGraphic;
let scene;
let terrainSegments = [];
let score = 0;
let scoreText;
let gameOver = false;
let lastTerrainX = 0;
let snowParticles;
let mountainLayers = [];
let cameraTarget = { x: 0, y: 0 };
let lastGroundAngle = 0;
let isAirborne = false;

// 地形生成器
class SurfaceGenerator {
    constructor(yScaling = 200, detailScaling = 80, gridSize = 20) {
        this.yScaling = yScaling;
        this.detailScaling = detailScaling;
        this.gridSize = gridSize;
    }

    perlinNoise(x) {
        const wave1 = Math.sin(x * 0.015) * 1.2;
        const wave2 = Math.sin(x * 0.04) * 0.6;
        const wave3 = Math.cos(x * 0.025) * 0.8;
        const wave4 = Math.sin(x * 0.08) * 0.3;
        return wave1 + wave2 + wave3 + wave4;
    }

    generateVertices(startX, startY) {
        const vertices = [];
        const step = 30;

        for (let i = 0; i <= this.gridSize; i++) {
            const x = startX + i * step;
            const noiseValue = this.perlinNoise(x / this.detailScaling);
            const z = noiseValue * this.yScaling;
            vertices.push({ x: x, y: startY + z });
        }

        return vertices;
    }
}

// 创建视差山脉层（优化版 - 减少顶点）
function createMountainLayer(scene, depth, color, offsetY, scale) {
    const graphics = scene.add.graphics();
    graphics.fillStyle(color, 0.3);
    graphics.setDepth(depth);
    graphics.setScrollFactor(scale, 0);

    const points = [];
    for (let x = -500; x < 3000; x += 150) {
        const noise = Math.sin(x * 0.003) * 150 + Math.cos(x * 0.007) * 80;
        points.push({ x, y: 450 + offsetY + noise });
    }

    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.lineTo(points[points.length - 1].x, 1080);
    graphics.lineTo(points[0].x, 1080);
    graphics.closePath();
    graphics.fillPath();

    return graphics;
}

// 创建游戏场景
function create() {
    scene = this;

    // 先创建白色粒子纹理
    const tempGraphics = this.add.graphics();
    tempGraphics.fillStyle(0xffffff, 1);
    tempGraphics.fillCircle(2, 2, 2);
    tempGraphics.generateTexture('white', 4, 4);
    tempGraphics.destroy();

    // 视差山脉背景（减少到2层）
    mountainLayers.push(createMountainLayer(this, -2, 0x2a2d44, -50, 0.2));
    mountainLayers.push(createMountainLayer(this, -1, 0x4a4d64, 60, 0.4));

    // 雪花粒子系统（减少频率）
    snowParticles = this.add.particles(0, 0, 'white', {
        x: { min: 0, max: 1920 },
        y: -50,
        lifespan: 6000,
        speedY: { min: 30, max: 50 },
        speedX: { min: -10, max: 10 },
        scale: { start: 0.25, end: 0.1 },
        alpha: { start: 0.6, end: 0.2 },
        frequency: 250,
        blendMode: 'ADD',
        maxParticles: 80
    });
    snowParticles.setDepth(100);
    snowParticles.setScrollFactor(0.6, 0.6);

    // 生成地形（减少初始段数）
    const generator = new SurfaceGenerator(200, 80, 20);
    for (let i = 0; i < 4; i++) {
        createTerrainSegment(this, generator, i * 625);
    }

    // 创建玩家
    player = this.matter.add.rectangle(200, 400, 28, 38, {
        friction: 0.02,
        frictionAir: 0.008,
        restitution: 0.1,
        density: 0.002,
        chamfer: { radius: 4 }
    });

    playerGraphic = this.add.rectangle(200, 400, 28, 38, 0xffffff);
    playerGraphic.setDepth(10);

    this.matter.body.setVelocity(player, { x: 4, y: 0 });

    // 相机固定跟随玩家
    this.cameras.main.startFollow(playerGraphic, true, 0.1, 0.1, -400, 0);
    this.cameras.main.setBounds(0, 0, 20000, 1080);

    // 分数显示
    scoreText = this.add.text(40, 40, '0m', {
        fontSize: '56px',
        fontFamily: 'Georgia, serif',
        fill: '#ffffff',
        alpha: 0.9
    });
    scoreText.setScrollFactor(0);
    scoreText.setDepth(200);

    // 跳跃控制
    this.input.keyboard.on('keydown-SPACE', () => {
        if (!gameOver && !isAirborne) {
            this.matter.body.setVelocity(player, {
                x: player.velocity.x,
                y: -13
            });
            isAirborne = true;
        }
    });

    this.input.on('pointerdown', () => {
        if (!gameOver && !isAirborne) {
            this.matter.body.setVelocity(player, {
                x: player.velocity.x,
                y: -13
            });
            isAirborne = true;
        } else if (gameOver) {
            location.reload();
        }
    });
}

// 创建地形段
function createTerrainSegment(scene, generator, startX) {
    const baseY = 650;
    const topVertices = generator.generateVertices(startX, baseY);

    const graphics = scene.add.graphics();
    graphics.setDepth(0);
    const terrainBodies = [];

    // 绘制雪地
    graphics.fillStyle(0xffffff, 1);
    graphics.beginPath();
    graphics.moveTo(topVertices[0].x, topVertices[0].y);

    for (let i = 1; i < topVertices.length; i++) {
        graphics.lineTo(topVertices[i].x, topVertices[i].y);
    }

    graphics.lineTo(topVertices[topVertices.length - 1].x, baseY + 400);
    graphics.lineTo(topVertices[0].x, baseY + 400);
    graphics.closePath();
    graphics.fillPath();

    // 创建物理体
    for (let i = 0; i < topVertices.length - 1; i++) {
        const v1 = topVertices[i];
        const v2 = topVertices[i + 1];

        const heightDiff = v2.y - v1.y;
        const distance = v2.x - v1.x;
        const slope = distance > 0 ? Math.abs(heightDiff / distance) : 0;

        if (slope < 1.2) {
            const segmentWidth = Math.sqrt((v2.x - v1.x) ** 2 + (v2.y - v1.y) ** 2);
            const centerX = (v1.x + v2.x) / 2;
            const centerY = (v1.y + v2.y) / 2;
            const angle = Math.atan2(v2.y - v1.y, v2.x - v1.x);

            const body = scene.matter.add.rectangle(centerX, centerY, segmentWidth, 15, {
                isStatic: true,
                friction: 0.6,
                angle: angle,
                label: 'terrain'
            });

            terrainBodies.push({ body, angle });
        }
    }

    terrainSegments.push({
        x: startX,
        bodies: terrainBodies,
        graphics: graphics
    });

    lastTerrainX = startX;
}

// 更新游戏
function update(time, delta) {
    if (gameOver) return;

    // 同步玩家图形
    playerGraphic.x = player.position.x;
    playerGraphic.y = player.position.y;
    playerGraphic.rotation = player.angle;

    // 检测是否在地面
    const wasAirborne = isAirborne;
    isAirborne = Math.abs(player.velocity.y) > 0.5;

    // 落地检测与相机抖动
    if (wasAirborne && !isAirborne) {
        const impactAngle = Math.abs(player.angle);
        if (impactAngle > 0.4) {
            scene.cameras.main.shake(80, 0.002);
        }
    }

    // 持续加速
    if (player.velocity.x < 8) {
        scene.matter.body.applyForce(player, player.position, { x: 0.0015, y: 0 });
    }

    // 生成新地形
    if (player.position.x > lastTerrainX - 1500) {
        const generator = new SurfaceGenerator(200, 80, 25);
        createTerrainSegment(scene, generator, lastTerrainX + 625);
    }

    // 清理旧地形
    terrainSegments = terrainSegments.filter(segment => {
        if (segment.x < player.position.x - 1000) {
            segment.bodies.forEach(b => scene.matter.world.remove(b.body));
            segment.graphics.destroy();
            return false;
        }
        return true;
    });

    // 更新分数
    score = Math.max(0, Math.floor(player.position.x / 10));
    scoreText.setText(score + 'm');

    // 检查掉落
    if (player.position.y > 1400) {
        gameOver = true;
        const gameOverText = scene.add.text(player.position.x, 540, score + 'm', {
            fontSize: '120px',
            fontFamily: 'Georgia, serif',
            fill: '#ffffff',
            alpha: 0.95
        });
        gameOverText.setOrigin(0.5);
        gameOverText.setDepth(300);

        scene.tweens.add({
            targets: gameOverText,
            alpha: 1,
            scale: 1.1,
            duration: 800,
            ease: 'Sine.inOut'
        });
    }
}
