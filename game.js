// 游戏配置
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1920,
        height: 1080,
        parent: 'game-container'
    },
    backgroundColor: '#87CEEB',
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 1 },
            debug: false
        }
    },
    scene: {
        create: create,
        update: update
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

// 地形生成器类（翻译自 Unity C# 代码）
class SurfaceGenerator {
    constructor(yScaling = 80, detailScaling = 3, gridSize = 20) {
        this.yScaling = yScaling;
        this.detailScaling = detailScaling;
        this.gridSize = gridSize;
    }

    // Perlin Noise 实现（简化版）
    perlinNoise(x, y) {
        // 使用正弦和余弦组合模拟 Perlin Noise
        const noise = Math.sin(x * 0.3) * Math.cos(y * 0.3) +
                      Math.sin(x * 0.7) * 0.5 +
                      Math.cos(y * 0.5) * 0.3;
        return (noise + 2) / 4; // 归一化到 0-1
    }

    // 生成地形顶点（翻译自 MeshCalculate）
    generateVertices(startX, startY) {
        const vertices = [];
        const step = 30; // 每个顶点之间的距离

        for (let i = 0; i <= this.gridSize; i++) {
            const x = startX + i * step;
            const y = startY;

            // 使用 Perlin Noise 计算高度
            const noiseValue = this.perlinNoise(
                x / this.detailScaling,
                y / this.detailScaling
            );

            const z = noiseValue * this.yScaling;

            vertices.push({ x: x, y: y + z });
        }

        return vertices;
    }

    // 生成封闭的多边形顶点（用于 Matter.js）
    generateClosedPolygon(startX, baseY) {
        const topVertices = this.generateVertices(startX, baseY);
        const vertices = [...topVertices];

        // 添加底部顶点形成封闭多边形
        const lastX = topVertices[topVertices.length - 1].x;
        vertices.push({ x: lastX, y: baseY + 200 });
        vertices.push({ x: startX, y: baseY + 200 });

        return vertices;
    }
}

// 创建游戏场景
function create() {
    scene = this;
    console.log('Game created!');

    const generator = new SurfaceGenerator(80, 150, 20);

    // 生成初始地形段
    for (let i = 0; i < 5; i++) {
        createTerrainSegment(scene, generator, i * 600);
    }

    // 创建玩家（在第一个地形段上方）
    player = this.matter.add.rectangle(100, 300, 30, 40, {
        friction: 0.01,
        frictionAir: 0.005,
        restitution: 0.2,
        density: 0.001
    });

    // 创建玩家图形
    playerGraphic = this.add.rectangle(100, 300, 30, 40, 0xFF4444);

    console.log('Player created:', player);

    // 给玩家初始向右的速度
    this.matter.body.setVelocity(player, { x: 3, y: 0 });

    // 相机跟随玩家
    this.cameras.main.startFollow(playerGraphic, true, 0.1, 0.1, -400, 0);
    this.cameras.main.setBounds(0, 0, 20000, 1080);

    // 分数显示（适配大屏幕）
    scoreText = this.add.text(30, 30, '距离: 0m', {
        fontSize: '48px',
        fontFamily: 'Arial, sans-serif',
        fill: '#fff',
        stroke: '#000',
        strokeThickness: 6,
        fontStyle: 'bold'
    });
    scoreText.setScrollFactor(0);

    // 跳跃控制
    this.input.keyboard.on('keydown-SPACE', () => {
        if (!gameOver) {
            this.matter.body.setVelocity(player, {
                x: player.velocity.x,
                y: -12
            });
        }
    });

    this.input.on('pointerdown', () => {
        if (!gameOver) {
            this.matter.body.setVelocity(player, {
                x: player.velocity.x,
                y: -12
            });
        } else {
            location.reload();
        }
    });

    // 提示文字（适配大屏幕）
    const hint = this.add.text(960, 200, '点击屏幕或按空格跳跃', {
        fontSize: '48px',
        fontFamily: 'Arial, sans-serif',
        fill: '#fff',
        stroke: '#000',
        strokeThickness: 6
    });
    hint.setOrigin(0.5);
    hint.setScrollFactor(0);

    // 淡入淡出动画
    hint.setAlpha(0);
    this.tweens.add({
        targets: hint,
        alpha: 1,
        duration: 1000,
        ease: 'Sine.inOut'
    });

    this.time.delayedCall(4000, () => {
        this.tweens.add({
            targets: hint,
            alpha: 0,
            duration: 1000,
            ease: 'Sine.inOut',
            onComplete: () => hint.destroy()
        });
    });
}

// 创建地形段
function createTerrainSegment(scene, generator, startX) {
    const baseY = 800; // 适配1080p高度

    // 生成顶点
    const vertices = generator.generateClosedPolygon(startX, baseY);

    // 将顶点转换为相对于中心点的坐标
    const centerX = startX + 300;
    const centerY = baseY + 100;

    const relativeVertices = vertices.map(v => ({
        x: v.x - centerX,
        y: v.y - centerY
    }));

    // 使用 Matter.js 创建地形刚体
    const terrain = scene.matter.add.fromVertices(
        centerX,
        centerY,
        relativeVertices,
        {
            isStatic: true,
            friction: 0.8,
            label: 'terrain'
        },
        true,
        0.01,
        10,
        0.001
    );

    // 绘制地形图形
    const graphics = scene.add.graphics();
    graphics.fillStyle(0xFFFFFF, 1);
    graphics.lineStyle(3, 0xCCCCCC, 1);

    graphics.beginPath();
    graphics.moveTo(vertices[0].x, vertices[0].y);

    for (let i = 1; i < vertices.length; i++) {
        graphics.lineTo(vertices[i].x, vertices[i].y);
    }

    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();

    terrainSegments.push({
        x: startX,
        body: terrain,
        graphics: graphics
    });

    lastTerrainX = startX;
}

// 更新游戏
function update() {
    if (gameOver) return;

    // 同步玩家图形位置
    playerGraphic.x = player.position.x;
    playerGraphic.y = player.position.y;
    playerGraphic.rotation = player.angle;

    // 持续向右推力（模拟滑雪动力）
    if (player.velocity.x < 6) {
        scene.matter.body.applyForce(player, player.position, { x: 0.001, y: 0 });
    }

    // 生成新地形段
    if (player.position.x > lastTerrainX - 1200) {
        const generator = new SurfaceGenerator(80, 150, 20);
        createTerrainSegment(scene, generator, lastTerrainX + 600);
    }

    // 清理屏幕外的地形
    terrainSegments = terrainSegments.filter(segment => {
        if (segment.x < player.position.x - 800) {
            scene.matter.world.remove(segment.body);
            segment.graphics.destroy();
            return false;
        }
        return true;
    });

    // 更新分数
    score = Math.max(0, Math.floor(player.position.x / 10));
    scoreText.setText('距离: ' + score + 'm');

    // 检查掉落
    if (player.position.y > 1200) {
        gameOver = true;
        console.log('Game Over! Player fell off.');
        const gameOverText = scene.add.text(player.position.x, 540, '游戏结束!\n最终距离: ' + score + 'm\n点击重新开始', {
            fontSize: '72px',
            fontFamily: 'Arial, sans-serif',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 8,
            align: 'center',
            fontStyle: 'bold'
        });
        gameOverText.setOrigin(0.5);
    }
}
