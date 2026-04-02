---
name: xiaohongshu-auto-m2img
version: 2.2.0
description: 小红书自动化图文生成技能 V2 - 一键完成：主题分析→文章生成→富文本排版→封面生成→分页卡片→小红书文案。采用 z-card-image 渲染，1.9倍行距，白色背景，暖橙色高亮，支持8并发卡片生成。
metadata:
  openclaw:
    emoji: "📕"
    requires:
      skills: ["wechat-prompt-context", "z-card-image"]
      bins: ["wenyan"]
---

# 📕 小红书自动化图文生成技能 V2

一键完成小红书图文内容创作，采用 **z-card-image** 专业渲染，**1.9倍行距** 舒适阅读，**白色背景 + 暖橙色高亮** 清爽美观。

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

## 📋 详细步骤

### 步骤1：分析主题 + 生成提示词
复用 `wechat-prompt-context` 技能：
- 搜索相关文章素材
- 智能分析主题方向
- 生成专业提示词模板

### 步骤2：撰写完整文章
通过 `openclaw agent --agent creator` 调用笔杆子 agent：
- 支持 4 种文章类型：story/analysis/list/opinion
- 自动注入 Supermemory 记忆
- 生成 2000-3000 字深度文章

### 步骤3：Markdown转富文本
使用 `wenyan-cli` 生成 pie 主题富文本：
- 主色：深蓝灰 (#2c3e50)
- 强调：蓝色 (#3498db)
- 背景：浅灰白 (#fafafa)

### 步骤4：生成封面图
使用 `z-card-image` 的 `cover-3-4` 模板生成专业封面：
- **主标题**：话题本身，红色粗黑字体 (110px, font-weight: 900)
- **副标题**：生成的小标题，红色粗黑字体 (48px)
- **Footer**：字数统计 + 预估阅读时间
- **样式**：1.2倍行距，无header，无"全文完"

### 步骤5：动态分页 + 生成卡片
使用 `z-card-image` 的 `article-3-4` 模板：
- **并发数**：8张同时生成
- **分页逻辑**：按语义边界切分，每页约320字符
- **卡片规格**：900x1200，3:4比例
- **配色**：白色背景 #ffffff，暖橙色高亮 #ff6b35
- **底部文字**：✦ 个人原创，请勿转载
- **页码显示**：1/8, 2/8... 全文完

### 步骤6：改写小红书文案（LLM网感化改写）
- **LLM深度改写**：调用笔杆子 agent 进行真正的口语化改写，而非简单正则替换
- **网感优化**：短句、断句、口语化表达，带"我"的视角
- **自然emoji**：根据内容语义智能添加，贴合情绪
- **互动引导**：结尾自动添加提问、求点赞等互动话术
- **字数限制**：800-1000字
- **生成hashtag**：自动提取关键词

### 步骤7：整理输出
简化文件夹结构：
```
output/YYYYMMDD_标题/
├── formatted/          # 文章富文本
│   ├── article.md      # 原始文章
│   ├── article.html    # pie主题富文本
│   ├── prompt.txt      # 使用的提示词
│   └── topic_analysis.json  # 主题分析
├── card/               # 卡片图片
│   ├── cover.jpg       # 封面图
│   ├── card_01.png     # 第1页
│   ├── card_02.png     # 第2页
│   └── ...
└── redbook_context.txt # 小红书文案（标题+正文+标签）
```

## 🚀 使用方法

### 基础用法
```bash
node ~/.openclaw/workspace/skills/xiaohongshu-auto-m2img/scripts/main.js "话题关键词"
```

### 指定文章类型
```bash
node ~/.openclaw/workspace/skills/xiaohongshu-auto-m2img/scripts/main.js "话题" --type analysis
```

### 完整参数
```bash
node ~/.openclaw/workspace/skills/xiaohongshu-auto-m2img/scripts/main.js "话题" \
  --type story \
  --theme pie
```

### 参数说明
| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--type` | 文章类型: story/analysis/list/opinion | story |
| `--theme` | 排版主题: pie/lapis/orangeheart等 | pie |

## 📁 输出结构

```
output/YYYYMMDD_小红书标题/
├── formatted/
│   ├── article.md
│   ├── article.html
│   ├── prompt.txt
│   └── topic_analysis.json
├── card/
│   ├── cover.jpg
│   ├── card_01.png
│   ├── card_02.png
│   └── ...
└── redbook_context.txt
```

## 🎨 卡片设计规范

### 配色方案
| 元素 | 颜色 | 色值 |
|------|------|------|
| 背景 | 白色 | #ffffff |
| 正文 | 深灰 | #2a2a2a |
| 高亮 | 暖橙色 | #ff6b35 |
| 页码 | 浅灰 | #bbb |

### 排版规范
- **字体大小**：标题 22px，正文 28px，页码 18px
- **行距**：1.9倍
- **对齐**：两端对齐
- **边距**：顶部 40px，底部 30px

## 🔧 依赖安装

### 必需依赖
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

## 📊 性能优化

### 并发生成
- **并发数**：8张卡片同时生成
- **速度提升**：比串行模式快约 4-5 倍
- **分批执行**：每批最多8张，批次间休息500ms

### 容错机制
- **重试机制**：每张卡片失败时自动重试2次
- **断点续传**：已存在的卡片自动跳过
- **超时控制**：单张卡片60秒超时

## 📝 更新日志

### V2.2 (2026-04-02)
- ✅ **LLM网感化改写**：重写步骤6，调用笔杆子 agent 进行真正的口语化改写
- ✅ 告别机械正则替换，实现自然的"网感"表达
- ✅ 智能emoji添加（根据语义而非机械插入）
- ✅ 短句断句、口语化、带"我"的视角
- ✅ 自动添加互动引导（提问、求点赞收藏）

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

### V1.0
- 初始版本，基础功能实现

## 📄 License

MIT License - 自由使用和修改

---

**作者**：OpenClaw  
**版本**：V2.1  
**更新日期**：2026-04-02
