# 📖 小红书自动化图文生成技能 - 使用指南

## 快速开始

### 1. 安装依赖

```bash
# 安装 wenyan-cli（必需）
npm install -g @wenyan-md/cli

# 验证安装
wenyan --version  # 应显示版本号
```

### 2. 运行技能

```bash
# 基础用法
node ~/.openclaw/workspace/skills/xiaohongshu-auto-m2img/scripts/main.js "你的话题"

# 示例
node ~/.openclaw/workspace/skills/xiaohongshu-auto-m2img/scripts/main.js "如何养成早起习惯"
```

### 3. 查看输出

```bash
# 输出目录
ls ~/.openclaw/workspace/output/

# 查看最新生成
ls -lt ~/.openclaw/workspace/output/ | head -5
```

## 完整工作流程

### 第一步：选择话题

好的话题应该：
- 具体明确（"3个早起方法" > "关于早起"）
- 有痛点或利益点
- 适合小红书平台

**示例话题**：
- "为什么你总是焦虑"
- "金刚经到底写了什么"
- "30天自律挑战实录"
- "职场新人避坑指南"

### 第二步：选择文章类型

```bash
# 故事型 - 适合个人经历、情感故事
--type story

# 分析型 - 适合热点解读、趋势分析
--type analysis

# 清单型 - 适合方法论、攻略
--type list

# 观点型 - 适合评论、观点表达
--type opinion
```

### 第三步：等待生成

整个过程约需 3-5 分钟：
1. 分析主题（30秒）
2. 生成文章（1-2分钟）
3. 排版 + 封面（30秒）
4. 生成卡片（1-2分钟）
5. 改写文案（30秒）

### 第四步：查看结果

```bash
# 进入输出目录
cd ~/.openclaw/workspace/output/20260329_你的标题

# 查看文件结构
tree
```

### 第五步：发布到小红书

1. **打开小红书 APP**
2. **点击发布笔记**
3. **选择封面图**：`images/cover.jpg`
4. **上传卡片**：依次选择 `images/cards/` 中的图片
5. **复制标题**：从 `xiaohongshu/title.txt`
6. **复制正文**：从 `xiaohongshu/content.txt`
7. **添加标签**：从 `xiaohongshu/hashtags.txt`
8. **发布**

## 高级用法

### 自定义输出目录

```bash
node scripts/main.js "话题" --output /Users/你的用户名/Desktop/小红书内容
```

### 批量生成

```bash
# 创建话题列表文件
cat > topics.txt << EOF
如何养成早起习惯
为什么你总是焦虑
金刚经到底写了什么
EOF

# 批量生成
while read topic; do
  node scripts/main.js "$topic" --type story
done < topics.txt
```

### 修改默认主题

编辑 `scripts/main.js`：
```javascript
// 修改默认主题
const options = {
  topic: '',
  type: 'story',
  theme: 'lapis',  // 改为 lapis、orangeheart 等
  output: path.join(process.cwd(), 'output')
};
```

## 主题选择指南

| 主题 | 风格 | 适用内容 |
|------|------|----------|
| **pie** | 简洁优雅，蓝灰色调 | 通用，默认推荐 |
| **lapis** | 深蓝专业感 | 商业、科技 |
| **orangeheart** | 暖橙活力 | 生活、情感 |
| **newsroom** | 报纸严肃感 | 新闻、评论 |
| **sage** | 清新自然绿 | 健康、环保 |
| **ember** | 暖色调温馨 | 故事、人文 |

## 故障排查

### 问题1：wenyan-cli 未找到

**症状**：`wenyan: command not found`

**解决**：
```bash
npm install -g @wenyan-md/cli
# 或
yarn global add @wenyan-md/cli
```

### 问题2：字体渲染异常

**症状**：卡片中文字显示为方框

**解决**：
- 系统已安装中文字体（PingFang、Heiti 等）
- 或修改脚本使用系统默认字体

### 问题3：文章生成失败

**症状**：步骤2报错，无文章生成

**解决**：
- 检查网络连接
- 检查 wechat-prompt-context 技能是否正常
- 尝试更换话题

### 问题4：封面/卡片生成失败

**症状**：图片文件缺失或损坏

**解决**：
- 检查 Python3 和 PIL 是否安装
- 检查是否有写入权限
- 查看错误日志

## 最佳实践

### 1. 话题选择
- 使用疑问句："为什么..."、"如何..."
- 使用数字："3个方法"、"5个技巧"
- 引发好奇："看完我沉默了"、"真相是..."

### 2. 内容优化
- 文章生成后可手动润色
- 卡片顺序可调整
- 标题可根据平台特点优化

### 3. 发布时机
- 小红书最佳发布时间：7-9点、12-14点、18-22点
- 配合热门话题标签
- 首图要吸引眼球

### 4. 数据分析
- 关注阅读量、点赞数、收藏数
- 根据数据反馈调整话题选择
- 记录爆款话题，批量生成

## 常见问题 FAQ

**Q: 生成的内容可以商用吗？**
A: 可以，但建议人工审核后再发布。

**Q: 可以生成英文内容吗？**
A: 当前版本针对中文优化，英文支持有限。

**Q: 生成的图片分辨率是多少？**
A: 封面 900x1200，卡片 900x1200，适合小红书 3:4 比例。

**Q: 可以自定义卡片样式吗？**
A: 可以修改 `generateCardWithContent` 函数中的配色和布局。

**Q: 为什么 wenyan-cli 调用失败？**
A: 可能未安装或环境变量问题，使用备用方案生成 pie 主题样式。

## 更新计划

- [ ] 支持更多主题样式
- [ ] 支持自定义字体
- [ ] 支持批量生成
- [ ] 支持自动发布到小红书
- [ ] 支持视频脚本生成

---

**需要帮助？**
查看 SKILL.md 获取技术细节，或查看源代码了解实现原理。
