# 小红书自动化图文生成技能

一键完成小红书图文内容创作，从主题分析到发布素材，全流程自动化。

## 🚀 快速开始

```bash
node scripts/main.js "你的话题"
```

## ✨ 功能特性

- **主题分析** - 智能分析话题方向
- **文章生成** - 笔杆子 agent 生成深度文章
- **富文本排版** - wenyan-cli pie 主题
- **封面生成** - 豆包图片生成
- **卡片渲染** - z-card-image 专业渲染
- **小红书文案** - 自动改写 + 去AI味
- **8并发** - 大幅提升生成速度

## 📁 项目结构

```
.
├── scripts/
│   └── main.js              # 主脚本
├── assets/
│   └── default-cover.jpg    # 默认封面
├── output/                  # 输出目录
├── SKILL.md                 # 技能文档
└── README.md               # 本文件
```

## 🎨 卡片设计

- **尺寸**: 900x1200 (3:4比例)
- **背景**: 白色 #ffffff
- **高亮**: 暖橙色 #ff6b35
- **行距**: 1.9倍
- **底部**: ✦ 个人原创，请勿转载

## 📦 依赖

- wechat-prompt-context
- z-card-image
- doubao-image-create
- wenyan-cli

## 📝 使用方法

```bash
# 基础用法
node scripts/main.js "AI产品经理"

# 指定类型
node scripts/main.js "AI产品经理" --type analysis
```

## 📄 输出结构

```
output/YYYYMMDD_标题/
├── formatted/          # 文章富文本
├── card/              # 卡片图片
│   ├── cover.jpg
│   ├── card_01.png
│   └── ...
└── redbook_context.txt # 小红书文案
```

## 🔧 安装

```bash
# 安装 wenyan-cli
npm install -g @wenyan-md/cli

# 安装依赖技能
# - wechat-prompt-context
# - z-card-image
# - doubao-image-create
```

## 📊 性能

- 8张卡片并发生成
- 比串行模式快 4-5 倍
- 支持断点续传

## 📜 License

MIT

---

**版本**: V2.0  
**更新**: 2026-03-31
