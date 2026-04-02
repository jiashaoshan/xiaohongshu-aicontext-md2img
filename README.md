# 小红书自动化图文生成技能 V2

一键完成小红书图文内容创作，采用 **z-card-image** 专业渲染，**1.9倍行距** 舒适阅读，**白色背景 + 暖橙色高亮** 清爽美观。

## 🚀 快速开始

```bash
node scripts/main.js "你的话题"
```

## ✨ 核心特性

| 特性 | 说明 |
|------|------|
| **z-card-image** | 专业卡片渲染，900x1200 3:4比例 |
| **封面优化** | 红色粗黑标题 + 副标题 + 字数/阅读时间footer |
| **1.9倍行距** | 阅读舒适不拥挤 |
| **白色背景** | #ffffff 清爽干净 |
| **暖橙色高亮** | #ff6b35 突出重点 |
| **8并发生成** | 最多8张卡片同时生成，大幅提升速度 |
| **7步自动化** | 从主题到发布素材，一键完成 |
| **去AI味** | 自动优化文案，更自然真实 |
| **外部配置** | 支持 config/default.json 自定义配置 |

## 🔄 7步工作流

```
用户输入话题
    ↓
[步骤1] 分析主题 + 生成提示词 → wechat-prompt-context
    ↓
[步骤2] 撰写完整文章 → 笔杆子 agent
    ↓
[步骤3] Markdown转富文本 → wenyan-cli (pie主题)
    ↓
[步骤4] 生成封面图 → z-card-image (红色粗黑标题封面)
    ↓
[步骤5] 动态分页 + 生成卡片 → z-card-image (8并发)
    ↓
[步骤6] 改写小红书文案 → 1000字 + 去AI味
    ↓
[步骤7] 整理输出 → 简化文件夹结构
    ↓
输出：完整小红书发布包
```

## 📁 项目结构

```
.
├── config/
│   └── default.json         # 配置文件（可自定义）
├── scripts/
│   └── main.js              # 主脚本
├── assets/
│   └── default-cover.jpg    # 默认封面
├── .gitignore               # Git忽略文件
├── SKILL.md                 # 技能文档
└── README.md                # 本文件
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

# 完整参数
node scripts/main.js "话题" --type story --theme pie
```

### 参数说明
| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--type` | 文章类型: story/analysis/list/opinion | story |
| `--theme` | 排版主题: pie/lapis/orangeheart等 | pie |

## ⚙️ 自定义配置

编辑 `config/default.json` 可自定义：

- **card.concurrentLimit**: 并发数（默认8）
- **card.charsPerPage**: 每页字符数（默认280）
- **xiaohongshu.contentMaxLength**: 小红书文案字数（默认1000）
- **cardStyle.bgColor**: 背景色（默认#ffffff）
- **cardStyle.highlightColor**: 高亮色（默认#ff6b35）
- **cardStyle.footerText**: 底部文字（默认"个人原创，请勿转载"）
- **cover.template**: 封面图模板

## 📄 输出结构

```
output/YYYYMMDD_标题/
├── formatted/          # 文章富文本
│   ├── article.md      # 原始文章
│   ├── article.html    # pie主题富文本
│   ├── prompt.txt      # 使用的提示词
│   └── topic_analysis.json  # 主题分析
├── card/              # 卡片图片
│   ├── cover.jpg      # 封面图
│   ├── card_01.png    # 第1页
│   ├── card_02.png    # 第2页
│   └── ...
└── redbook_context.txt # 小红书文案（标题+正文+标签）
```

## 🔧 安装

```bash
# 安装 wenyan-cli
npm install -g @wenyan-md/cli

# 验证安装
wenyan --version
```

### 技能依赖
- `wechat-prompt-context` - 文章生成
- `z-card-image` - 卡片渲染
- `doubao-image-create` - 封面生成

## 📊 性能

- **8张卡片并发生成**
- 比串行模式快 **4-5 倍**
- 支持断点续传
- 单张卡片60秒超时

## 📝 更新日志

### V2.1 (2026-04-02)
- ✅ 封面标题使用小红书文案标题（而非文章原标题）
- ✅ 封面位置下移（margin-top: 200px）
- ✅ 正文header/footer边距对称（56px）
- ✅ 修复偶数卡片footer缺失问题（content添加max-height: 975px）
- ✅ 优化分页密度（charsPerPage 280→240，安全系数0.85→0.75）

### V2.0 (2026-03-31)
- ✅ 采用 z-card-image 专业渲染
- ✅ 实现 1.9 倍行距
- ✅ 白色背景 + 暖橙色高亮
- ✅ 8并发卡片生成
- ✅ 去AI味处理
- ✅ 简化输出结构
- ✅ 修复底部截断问题
- ✅ 外部配置文件支持

## 📜 License

MIT License - 自由使用和修改

---

**作者**: OpenClaw  
**版本**: V2.1  
**更新日期**: 2026-04-02
