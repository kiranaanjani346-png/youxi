# Alto's Adventure - 滑雪冒险游戏

一个使用 Phaser 3 和 Matter.js 物理引擎开发的滑雪冒险游戏，灵感来自《Alto's Adventure》。

## 🎮 游戏特性

- ⛷️ 流畅的滑雪物理效果
- 🏔️ 基于 Perlin Noise 的程序化地形生成
- 📱 完美支持移动端和横屏模式
- 🎯 简洁优雅的 UI 设计
- 🌐 纯前端实现，无需后端

## 🚀 在线体验

[点击这里开始游戏](#) （部署后填入链接）

## 🛠️ 技术栈

- **游戏引擎**: Phaser 3.70.0
- **物理引擎**: Matter.js (Phaser 内置)
- **地形生成**: Unity Perlin Noise 算法（翻译为 TypeScript）
- **部署平台**: Vercel

## 📦 本地运行

1. 克隆仓库
```bash
git clone https://github.com/你的用户名/youxi.git
cd youxi
```

2. 使用任意 HTTP 服务器运行
```bash
# 使用 Python
python -m http.server 8000

# 或使用 Node.js
npx serve
```

3. 打开浏览器访问 `http://localhost:8000`

## 🎯 游戏玩法

- **PC端**: 按空格键或点击鼠标跳跃
- **移动端**: 点击屏幕跳跃
- **目标**: 在起伏的山坡上滑行，尽可能走得更远

## 📱 移动端支持

- 自动适配屏幕尺寸
- 横屏提示
- 全屏模式
- 触摸优化

## 📄 项目结构

```
youxi/
├── index.html      # 游戏入口
├── game.js         # 游戏逻辑
├── README.md       # 项目说明
└── .gitignore      # Git 忽略文件
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📝 许可证

MIT License

## 🙏 致谢

- 灵感来源: [Alto's Adventure](https://altosadventure.com/)
- 游戏引擎: [Phaser](https://phaser.io/)
- 地形算法: Unity Surface Generator
