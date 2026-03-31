# 📕 小红书自动化图文生成技能 V2

一键生成小红书图文内容，采用 **Pie 主题** 专业排版，**1.5倍行距** 舒适阅读，**两端对齐** 整齐美观。

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install -g @wenyan-md/cli

# 2. 运行技能
node ~/.openclaw/workspace/skills/xiaohongshu-auto-m2img/scripts/main.js "你的话题"

# 3. 查看输出
ls ~/.openclaw/workspace/output/
```

## ✨ 核心特性

- ✅ **Pie 主题** - 深蓝灰主色 + 蓝色强调，专业优雅
- ✅ **1.5倍行距** - 36px行距，阅读舒适
- ✅ **两端对齐** - 文字左右对齐，整齐美观
- ✅ **7步自动化** - 从主题到发布素材，一键完成
- ✅ **富文本排版** - 支持 wenyan-cli 专业排版

## 📋 7步工作流

1. **分析主题** - 智能分析话题方向
2. **生成文章** - LLM撰写 2000-3000 字深度内容
3. **富文本排版** - pie 主题，1.5倍行距，两端对齐
4. **生成封面** - 竖版 900x1200，pie 主题风格
5. **分页卡片** - 5-6 张卡片，完整文章内容
6. **改写文案** - 爆款标题 + emoji + hashtag
7. **整理输出** - 日期+标题命名文件夹

## 📁 输出结构

```
output/YYYYMMDD_小红书标题/
├── article/
│   ├── article.md           # 原始文章
│   ├── prompt.txt           # 使用的提示词
│   └── topic_analysis.json  # 主题分析
├── formatted/
│   └── article.html         # pie主题富文本
├── images/
│   ├── cover.jpg            # 封面图
│   └── cards/               # 分页卡片
│       ├── card_01.jpg
│       ├── card_02.jpg
│       └── ...
├── xiaohongshu/
│   ├── title.txt            # 爆款标题
│   ├── content.txt          # 小红书文案
│   └── hashtags.txt         # 推荐标签
└── README.md                # 使用说明
```

## 🎨 Pie 主题设计

### 配色方案
| 元素 | 颜色 | 色值 |
|------|------|------|
| 主色 | 深蓝灰 | #2c3e50 |
| 强调 | 蓝色 | #3498db |
| 正文 | 深灰 | #333333 |
| 背景 | 浅灰白 | #fafafa |

### 排版规范
- **字体大小**：标题 32px，正文 24px
- **行距**：1.5倍（36px）
- **对齐**：两端对齐
- **边距**：左右 60px

## 📖 使用示例

```bash
# 基础用法
node scripts/main.js "金刚经到底写了什么"

# 指定文章类型
node scripts/main.js "如何养成早起习惯" --type list

# 完整参数
node scripts/main.js "话题" --type story --theme pie --output ./output/
```

## 📚 文档

- **SKILL.md** - 完整技能文档，技术细节
- **GUIDE.md** - 详细使用指南，最佳实践
- **scripts/main.js** - 主程序源代码

## 🔧 依赖

- Node.js >= 18
- wenyan-cli (`npm install -g @wenyan-md/cli`)
- Python3 + PIL (系统通常自带)

## 📄 License

MIT License

---

**版本**：V2.0  
**更新日期**：2026-03-29  
**作者**：OpenClaw
