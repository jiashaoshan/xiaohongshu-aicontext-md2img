#!/usr/bin/env node
/**
 * 小红书自动化图文生成技能 - 主脚本
 * 7步工作流:分析→生成→排版→封面→分页→改写→整理
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SKILL_DIR = path.dirname(path.dirname(__filename));
const WECHAT_PROMPT = path.join(process.env.HOME, '.openclaw/workspace/skills/wechat-prompt-context');
const MARKDOWN_TO_IMAGE = path.join(process.env.HOME, '.openclaw/workspace/skills/markdown-to-image');
const DOUBAO_IMAGE = path.join(process.env.HOME, '.openclaw/workspace/skills/doubao-image-create');
const Z_CARD_IMAGE = path.join(process.env.HOME, '.openclaw/workspace/skills/z-card-image');

// 加载配置
const CONFIG = loadConfig();

function loadConfig() {
  const configPath = path.join(SKILL_DIR, 'config', 'default.json');
  console.log(`   → 加载配置文件: ${configPath}`);
  try {
    if (!fs.existsSync(configPath)) {
      console.warn(`⚠️  配置文件不存在: ${configPath}`);
      return {};
    }
    const configData = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configData);
    console.log('   ✅ 配置文件加载成功');
    return config;
  } catch (e) {
    console.warn(`⚠️  配置文件加载失败: ${e.message}`);
    return {};
  }
}

// 解析参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    topic: '',
    type: 'story',
    theme: 'pie',
    output: path.join(process.cwd(), 'output')
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) {
      options.topic = arg;
    } else if (arg === '--type') {
      options.type = args[++i];
    } else if (arg === '--theme') {
      options.theme = args[++i];
    } else if (arg === '--output') {
      options.output = args[++i];
    }
  }

  return options;
}

// 检查依赖
function checkDependencies() {
  console.log('🔍 检查依赖...');

  const deps = [
    { path: WECHAT_PROMPT, name: 'wechat-prompt-context' },
    { path: MARKDOWN_TO_IMAGE, name: 'markdown-to-image' },
    { path: DOUBAO_IMAGE, name: 'doubao-image-create' }
  ];

  for (const dep of deps) {
    if (!fs.existsSync(dep.path)) {
      console.error(`❌ 缺少依赖: ${dep.name}`);
      process.exit(1);
    }
  }

  console.log('✅ 依赖检查通过');
}

// 步骤1:分析主题 + 生成提示词
function step1AnalyzeAndGeneratePrompt(topic, type) {
  console.log('\n📝 步骤1: 分析主题 + 生成提示词...');
  const startTime = Date.now();

  try {
    // 步骤1.1: 分析主题
    console.log('   → 分析主题...');
    const analyzeCmd = `cd "${WECHAT_PROMPT}" && node scripts/analyze-topic.js "${topic}"`;
    execSync(analyzeCmd, { stdio: 'pipe' });

    // 读取分析结果
    const analysisPath = path.join(WECHAT_PROMPT, 'output/topic_analysis.json');
    const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
    console.log(`   ✅ 推荐主题: ${analysis.recommendedTopic || topic}`);
    console.log(`   📊 文章类型: ${analysis.articleType || type}`);
    console.log(`   👥 目标读者: ${analysis.targetAudience || '未指定'}`);

    // 步骤1.2: 生成提示词
    console.log('   → 生成提示词...');
    const generateCmd = `cd "${WECHAT_PROMPT}" && node scripts/generate-prompt.js "${topic}" ${type}`;
    execSync(generateCmd, { stdio: 'pipe' });

    // 读取生成的提示词
    const promptPath = path.join(WECHAT_PROMPT, 'output/generated_prompt.txt');
    const prompt = fs.readFileSync(promptPath, 'utf-8');
    console.log(`   📝 提示词长度: ${prompt.length} 字符`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ 步骤1完成 (${duration}s)`);
    return { analysis, prompt };
  } catch (error) {
    console.error('❌ 步骤1失败:', error.message);
    throw error;
  }
}

// 步骤2:撰写完整文章
async function step2WriteArticle(prompt, topic) {
  console.log('\n✍️  步骤2: 撰写完整文章...');
  const startTime = Date.now();

  try {
    // 保存提示词到文件
    const promptPath = path.join(WECHAT_PROMPT, 'output/confirmed_prompt.txt');
    fs.writeFileSync(promptPath, prompt);

    // 使用 wechat-prompt-context 的 write-article.js(传入文件路径)
    console.log('   → 调用笔杆子 agent 生成文章...');
    const writeCmd = `cd "${WECHAT_PROMPT}" && node scripts/write-article.js "${promptPath}" "${topic}"`;
    execSync(writeCmd, { stdio: 'pipe' });

    // 读取生成的文章
    const articlePath = path.join(WECHAT_PROMPT, 'output/article.md');
    const article = fs.readFileSync(articlePath, 'utf-8');

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ 文章生成完成 (${duration}s)`);
    console.log(`   📄 文章长度: ${article.length} 字符`);
    console.log(`   📖 预估字数: ${Math.floor(article.length / 1.5)} 字`);
    return article;
  } catch (error) {
    console.error('❌ 步骤2失败:', error.message);
    throw error;
  }
}

// 步骤3:Markdown转富文本(使用wenyan-cli的pie主题)
function step3ConvertToRichText(article, outputDir, theme = 'pie') {
  console.log('\n🎨 步骤3: Markdown转富文本...');

  try {
    // 保存原始Markdown(需要添加frontmatter)
    const articlePath = path.join(outputDir, 'article.md');

    // 提取标题
    const titleMatch = article.match(/^# (.+)$/m);
    const title = titleMatch ? titleMatch[1] : '文章';

    // 添加wenyan需要的frontmatter
    const articleWithFrontmatter = `---
title: "${title}"
cover: "./cover.jpg"
---

${article.replace(/^---[\s\S]*?---\n*/, '')}`;

    fs.writeFileSync(articlePath, articleWithFrontmatter);

    const htmlPath = path.join(outputDir, 'article.html');

    // 尝试使用 wenyan render 生成带样式的HTML(不发布,只渲染)
    // 默认使用 pie 主题,1.5倍行距
    const convertCmd = `wenyan render -f "${articlePath}" -t ${theme} -h github > "${htmlPath}" 2>&1`;

    try {
      execSync(convertCmd, { stdio: 'pipe', timeout: 30000 });

      // 检查是否生成成功
      if (fs.existsSync(htmlPath) && fs.statSync(htmlPath).size > 1000) {
        console.log('✅ 富文本转换完成(pie主题)');
        return htmlPath;
      }
    } catch (e) {
      console.log('   ⚠️  wenyan render 调用失败,使用备用方案');
    }

    // 备用方案：生成pie主题风格的HTML（1.5倍行距，两端对齐）
    const htmlContent = generatePieThemeHTML(article);
    fs.writeFileSync(htmlPath, htmlContent);
    console.log('✅ 富文本转换完成（pie主题样式，1.5倍行距，两端对齐）');
    return htmlPath;
  } catch (error) {
    console.error('⚠️  富文本转换失败:', error.message);
    return path.join(outputDir, 'article.md');
  }
}

// 生成pie主题风格的HTML
function generatePieThemeHTML(article) {
  // 处理文章内容
  let content = article
    .replace(/^---[\s\S]*?---\n*/, '') // 移除frontmatter
    .replace(/^# (.+)$/m, '<h1>$1</h1>') // 主标题
    .replace(/^## (.+)$/gm, '<h2>$1</h2>') // 二级标题
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // 粗体
    .replace(/\n\n/g, '</p><p>') // 段落
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith('<')) return match;
      return `<p>${match}</p>`;
    });

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>文章</title>
<style>
/* Pie Theme - 简洁优雅 */
:root {
  --primary-color: #2c3e50;
  --text-color: #333;
  --bg-color: #fafafa;
  --border-color: #e8e8e8;
  --accent-color: #3498db;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-color);
  background: var(--bg-color);
  max-width: 680px;
  margin: 0 auto;
  padding: 40px 20px;
}

h1 {
  font-size: 28px;
  font-weight: 600;
  color: var(--primary-color);
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 2px solid var(--border-color);
}

h2 {
  font-size: 22px;
  font-weight: 600;
  color: var(--primary-color);
  margin-top: 40px;
  margin-bottom: 20px;
  padding-left: 15px;
  border-left: 4px solid var(--accent-color);
}

p {
  margin-bottom: 20px;
  line-height: 1.5;  /* 1.5倍行距 */
  text-align: justify;  /* 两端对齐 */
  text-justify: inter-ideograph;  /* 中文两端对齐优化 */
}

strong {
  font-weight: 600;
  color: var(--primary-color);
}

blockquote {
  border-left: 3px solid var(--accent-color);
  padding-left: 20px;
  margin: 25px 0;
  color: #666;
  font-style: italic;
}

/* 代码高亮 */
code {
  background: #f4f4f4;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: "SF Mono", Monaco, monospace;
  font-size: 14px;
}

pre {
  background: #f8f8f8;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 20px 0;
}

/* 链接 */
a {
  color: var(--accent-color);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

/* 分隔线 */
hr {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 40px 0;
}

/* 列表 */
ul, ol {
  margin: 20px 0;
  padding-left: 30px;
}

li {
  margin-bottom: 10px;
}
</style>
</head>
<body>
${content}
</body>
</html>`;
}

// 步骤4:生成封面图(使用 z-card-image 生成标题页)
function step4GenerateCover(topic, summary, outputDir, title, article) {
  console.log('\n🖼️  步骤4: 生成封面图...');

  const coverPath = path.join(outputDir, 'cover.png');
  const coverHtmlPath = path.join(outputDir, 'cover.html');
  
  try {
    // 使用 z-card-image 生成标题页封面
    // 生成标题页 HTML 内容（大标题居中，宋体红色）
    const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // 从标题中提取副标题（如果有冒号或破折号）
    let subtitle = '';
    if (title.includes('：')) {
      subtitle = title.split('：')[1].trim();
    } else if (title.includes('——')) {
      subtitle = title.split('——')[1].trim();
    } else if (title.includes('-')) {
      subtitle = title.split('-')[1].trim();
    }
    const safeSubtitle = subtitle.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // 估算阅读时间（按每分钟300字计算）
    const wordCount = article.length;
    const readTime = Math.max(1, Math.ceil(wordCount / 300));
    
    // 主标题用话题本身，副标题用生成的小标题
    const mainTitle = topic;  // 话题本身，如"中国发展新质生产力的目的"
    const subtitleText = safeTitle;  // 生成的小标题，如"3分钟读懂..."
    
    const cardStyle = CONFIG.cardStyle || {};
    // 封面：标题=主标题(话题)，副标题=小标题
    // footer格式："字数XXX | 阅读约X分钟"
    const coverFooter = `字数 ${wordCount} | 阅读约 ${readTime} 分钟`;
    const cmd = `python3 "${Z_CARD_IMAGE}/scripts/render_article.py" \
      --title "${mainTitle}" \
      --text "${subtitleText}" \
      --page-num 1 \
      --page-total 1 \
      --out "${coverPath}" \
      --footer "${coverFooter}" \
      --bg "${cardStyle.bgColor || '#ffffff'}" \
      --highlight "${cardStyle.highlightColor || '#E60012'}" \
      --page-num 1 \
      --page-total 1 \
      --cover`;
    
    execSync(cmd, { stdio: 'pipe', timeout: 60000 });
    console.log('   ✅ 封面渲染完成:', coverPath);
    
    if (fs.existsSync(coverPath)) {
      console.log('✅ 封面图生成完成 (z-card-image 标题页)');
      return coverPath;
    }
  } catch (error) {
    console.error('⚠️  z-card-image 封面生成失败:', error.message);
    // 保留调试文件
    const debugHtmlPath = path.join(outputDir, 'cover_debug.html');
    fs.copyFileSync(coverHtmlPath, debugHtmlPath);
    console.log('   📝 调试HTML已复制:', debugHtmlPath);
  }
  
  // 备用：尝试豆包生成
  try {
    const cleanTopic = topic.replace(/"/g, '\\"').replace(/\n/g, ' ').substring(0, 30);
    const cleanSummary = summary.replace(/"/g, '\\"').replace(/\n/g, ' ').replace(/#/g, '').substring(0, 20);
    
    const coverConfig = CONFIG.cover || {};
    const template = coverConfig.template || '小红书封面卡片设计，纯白背景，竖版1440x2038像素。顶部文字区域：大标题粗黑体3号字正红色#E60012文字内容为"{topic}"，副标题宋体小4号红色带双引号文字为"{summary}"。中间配图区域：居中放置一张与主题相关的高质量配图，图片风格明亮温暖生活美学摄影风格，图片两侧保留大量白色留白对称布局，图片宽度约占卡片宽度的60-70%。整体风格：极简主义现代感专业大气留白充足视觉焦点突出，无多余装饰元素纯净简洁的排版设计';
    
    const prompt = template
      .replace(/{topic}/g, cleanTopic)
      .replace(/{summary}/g, cleanSummary);
    
    const size = coverConfig.size || '2K';
    const timeoutMs = coverConfig.timeoutMs || 120000;
    const cmd = `node "${DOUBAO_IMAGE}/scripts/generate.js" "${prompt}" --output "${coverPath}" --size ${size}`;
    execSync(cmd, { stdio: 'pipe', timeout: timeoutMs });
    
    if (fs.existsSync(coverPath)) {
      console.log('✅ 封面图生成完成 (豆包)');
      return coverPath;
    }
  } catch (error) {
    console.error('⚠️  豆包封面生成失败:', error.message);
  }
  
  // 使用默认图片
  const defaultCover = path.join(SKILL_DIR, 'assets/default-cover.jpg');
  if (fs.existsSync(defaultCover)) {
    fs.copyFileSync(defaultCover, coverPath);
    console.log('✅ 使用默认封面图');
    return coverPath;
  }
  
  return null;
}

// 步骤5:动态分页 + 生成卡片(使用z-card-image的article-3-4模板，支持并发)
async function step5GenerateCards(article, outputDir, topic) {
  console.log('\n📄 步骤5: 动态分页 + 生成卡片...');
  const startTime = Date.now();

  try {
    // 清理文章(移除frontmatter和标题)
    let cleanArticle = article.replace(/^---[\s\S]*?---\n*/, '');
    const titleMatch = cleanArticle.match(/^# (.+)$/m);
    const title = titleMatch ? titleMatch[1] : topic;
    cleanArticle = cleanArticle.replace(/^# .+\n/, '');
    
    // 过滤掉LLM的提示词和回复开头，只保留正文内容
    // 找到第一个真正的正文标题（以 # 开头但不是在提示词中的）
    // 常见模式：提示词后会有"让我开始写作："然后是正文
    
    // 方法1：查找"让我开始写作"之后的内容
    const writingMatch = cleanArticle.match(/让我开始写作[：:]\s*#+\s+/);
    if (writingMatch) {
      const startIndex = cleanArticle.indexOf(writingMatch[0]) + writingMatch[0].length - 1;
      cleanArticle = cleanArticle.substring(startIndex);
    }
    
    // 简化过滤：找到第一个真正的正文段落
    // 正文通常以 # 标题 开始，不是数字编号的列表项
    const lines = cleanArticle.split('\n');
    let startIndex = 0;
    let foundRealContent = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // 跳过空行和提示词相关的行
      if (!line) continue;
      
      // 找到真正的正文标题（不以数字开头，不是提示词关键词）
      if (line.match(/^#{1,2}\s+/) && !line.includes('写作：') && !line.includes('关键要求')) {
        startIndex = i;
        foundRealContent = true;
        break;
      }
      // 如果遇到普通段落（非列表非编号），且有实际内容，也开始
      if (line.length > 20 && !line.match(/^\d+[\.\)]\s+/) && !line.includes('：')) {
        // 检查是否是正文（非提示词）
        if (!line.includes('我已经收到了') && !line.includes('让我仔细分析')) {
          startIndex = i;
          foundRealContent = true;
          break;
        }
      }
    }
    
    if (foundRealContent) {
      cleanArticle = lines.slice(startIndex).join('\n');
    }

    // 按语义分页，每页约280-340字符（z-card-image建议）
    const charsPerPage = CONFIG.card?.charsPerPage || 320;
    const pages = splitArticleIntoPages(cleanArticle, charsPerPage);
    const totalPages = pages.length;
    
    console.log(`   📊 文章分 ${totalPages} 页`);
    console.log(`   📝 平均每页: ${Math.floor(cleanArticle.length / totalPages)} 字符`);
    console.log(`   ⚡ 并发生成: 最多${CONFIG.card?.concurrentLimit || 8}张同时生成`);

    // 生成卡片图片
    const cardsDir = path.join(outputDir, 'cards');
    if (!fs.existsSync(cardsDir)) {
      fs.mkdirSync(cardsDir, { recursive: true });
    }

    // 准备所有需要生成的卡片任务
    const tasks = [];
    for (let i = 0; i < totalPages; i++) {
      const cardPath = path.join(cardsDir, `card_${String(i + 1).padStart(2, '0')}.png`);
      
      // 跳过已存在的卡片（支持断点续传）
      if (fs.existsSync(cardPath)) {
        console.log(`   ⏭️  卡片 ${i + 1}/${totalPages} (已存在)`);
        continue;
      }
      
      tasks.push({
        pageIndex: i,
        pageContent: pages[i],
        cardPath: cardPath,
        title: title,
        totalPages: totalPages
      });
    }

    // 并发生成卡片
    const CONCURRENT_LIMIT = CONFIG.card?.concurrentLimit || 8;
    let completedCount = 0;
    
    async function generateCard(task) {
      const { pageIndex, pageContent, cardPath, title, totalPages } = task;
      const pageNum = pageIndex + 1;
      
      let success = false;
      let retries = CONFIG.card?.maxRetries || 2;
      
      while (!success && retries > 0) {
        try {
          // 使用z-card-image的render_article.py生成卡片
          const escapedContent = pageContent.replace(/"/g, '\\"');
          const escapedTitle = title.replace(/"/g, '\\"');
          
          const cardStyle = CONFIG.cardStyle || {};
          const showFooter = cardStyle.showFooter !== false;
          // 计算当前页的预估字数和阅读时间
          const pageCharCount = pageContent.length;
          const pageReadTime = Math.max(1, Math.ceil(pageCharCount / 300));
          // 生成实际的footer文本（不包含占位符）
          const pageFooter = showFooter ? `字数 ${pageCharCount} | 阅读约 ${pageReadTime} 分钟` : '';
          const cmd = `python3 "${Z_CARD_IMAGE}/scripts/render_article.py" \
            --title "${escapedTitle}" \
            --text "${escapedContent}" \
            --page-num ${pageNum} \
            --page-total ${totalPages} \
            --out "${cardPath}" \
            --footer "${pageFooter}" \
            --bg "${cardStyle.bgColor || '#ffffff'}" \
            --highlight "${cardStyle.highlightColor || '#E60012'}"`;
          
          await execAsync(cmd, { timeout: CONFIG.card?.timeoutMs || 60000 });
          
          completedCount++;
          console.log(`   ✅ 卡片 ${pageNum}/${totalPages} (${completedCount}/${tasks.length})`);
          success = true;
        } catch (e) {
          retries--;
          if (retries > 0) {
            console.log(`   🔄 卡片 ${pageNum} 重试中... (${e.message})`);
            await sleep(2000);
          } else {
            console.log(`   ❌ 卡片 ${pageNum} 生成失败: ${e.message}`);
          }
        }
      }
    }

    // 分批并发执行
    const batchDelayMs = CONFIG.card?.batchDelayMs || 500;
    for (let i = 0; i < tasks.length; i += CONCURRENT_LIMIT) {
      const batch = tasks.slice(i, i + CONCURRENT_LIMIT);
      await Promise.all(batch.map(task => generateCard(task)));
      
      // 每批完成后休息，避免系统过载
      if (i + CONCURRENT_LIMIT < tasks.length) {
        await sleep(batchDelayMs);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ 生成完成 (${duration}s)`);
    console.log(`   📁 卡片目录: ${cardsDir}`);
    return cardsDir;
  } catch (error) {
    console.error('❌ 卡片生成失败:', error.message);
    return null;
  }
}

// 异步执行命令的Promise包装
function execAsync(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    const child = exec(cmd, { ...options, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// 睡眠函数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 智能分页：按语义边界切分文章（保守策略，避免截断）
function splitArticleIntoPages(article, charsPerPage) {
  const pages = [];
  const paragraphs = article.split('\n').filter(p => p.trim());
  
  let currentPage = '';
  let currentChars = 0;
  
  // 估算字符数（英文算0.5个）
  function countChars(text) {
    let count = 0;
    for (const char of text) {
      if (/[\u4e00-\u9fa5]/.test(char)) {
        count += 1;  // 中文
      } else if (/[a-zA-Z0-9]/.test(char)) {
        count += 0.5;  // 英文数字
      } else {
        count += 0.3;  // 标点符号
      }
    }
    return count;
  }
  
  // 分页系数：预留15%空间避免截断和footer重叠
  const safeCharsPerPage = Math.floor(charsPerPage * 0.85);
  
  for (const para of paragraphs) {
    const paraChars = countChars(para);
    
    // 如果当前页加上这段会超限，且当前页不为空，则新开一页
    if (currentChars + paraChars > safeCharsPerPage && currentPage) {
      pages.push(currentPage.trim());
      currentPage = para;
      currentChars = paraChars;
    } else {
      currentPage += '\n\n' + para;
      currentChars += paraChars;
    }
  }
  
  // 最后一页
  if (currentPage) {
    pages.push(currentPage.trim());
  }
  
  return pages.length > 0 ? pages : [article];
}

// 使用PIL生成卡片(包含完整内容)
function generateCardWithContent(content, outputPath, cardsDir, cardNum, totalCards) {
  // 提取标题(第一行)
  const lines = content.split('\n');
  const title = lines[0].replace(/^#+ /, '').replace(/\*\*/g, '').substring(0, 25) || `第${cardNum}页`;
  const bodyLines = lines.slice(1).filter(l => l.trim()).slice(0, 8); // 最多8行正文

  // 将正文行写入临时文件,避免字符串转义问题
  const linesFile = path.join(cardsDir, `lines_${cardNum}.txt`);
  fs.writeFileSync(linesFile, bodyLines.join('\n'));

  const pythonCode = `# -*- coding: utf-8 -*-
from PIL import Image, ImageDraw, ImageFont
import os

width, height = 1440, 2038  # 小红书标准尺寸
img = Image.new('RGB', (width, height), (255, 255, 255))
draw = ImageDraw.Draw(img)

# 字体
def get_font(size):
    paths = [
        '/System/Library/Fonts/PingFang.ttc',
        '/System/Library/Fonts/STHeiti Light.ttc',
        '/System/Library/Fonts/Hiragino Sans GB.ttc'
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except:
                continue
    return ImageFont.load_default()

# Pie主题配色
PRIMARY_COLOR = (44, 62, 80)  # 深蓝灰 #2c3e50
ACCENT_COLOR = (52, 152, 219)  # 蓝色 #3498db
TEXT_COLOR = (51, 51, 51)  # 深灰 #333
BG_COLOR = (250, 250, 250)  # 浅灰白 #fafafa
LIGHT_BG = (245, 245, 245)  # 更浅灰

title_font = get_font(32)
body_font = get_font(24)
page_font = get_font(18)

# 标题区域 - pie主题风格(底部边框)
draw.rounded_rectangle([40, 40, width-40, 120], radius=15, fill=LIGHT_BG)
# 底部装饰线(蓝色)
draw.rectangle([60, 105, width-60, 110], fill=ACCENT_COLOR)

# 绘制标题
title = """${title.replace(/"/g, '\\"').replace(/\\n/g, ' ')}"""
bbox = draw.textbbox((0, 0), title, font=title_font)
x = (width - (bbox[2] - bbox[0])) // 2
draw.text((x, 60), title, font=title_font, fill=PRIMARY_COLOR)

# 读取正文行
with open("${linesFile}", "r", encoding="utf-8") as f:
    body_lines = f.readlines()

# 绘制正文(1.5倍行距,两端对齐)
y = 140
line_height = 36  # 1.5倍行距(24px字体 * 1.5 = 36px)

for line in body_lines:
    line = line.strip()
    if not line:
        y += 18  # 空行间距
        continue

    text = line[:90]
    max_width = width - 120  # 左右边距60px

    # 计算需要多少行
    words = []
    current = ''
    for char in text:
        test = current + char
        bbox = draw.textbbox((0, 0), test, font=body_font)
        if bbox[2] <= max_width:
            current = test
        else:
            if current:
                words.append(current)
            current = char
    if current:
        words.append(current)

    # 绘制每一行(两端对齐)
    for i, word in enumerate(words):
        if i == len(words) - 1:  # 最后一行左对齐
            draw.text((60, y), word, font=body_font, fill=TEXT_COLOR)
        else:  # 其他行两端对齐
            # 计算需要添加多少空格
            word_bbox = draw.textbbox((0, 0), word, font=body_font)
            word_width = word_bbox[2] - word_bbox[0]
            space_needed = max_width - word_width

            if len(word) > 1 and space_needed > 0:
                # 分散对齐:在字符间添加间距
                char_width = word_width / len(word)
                extra_space = space_needed / (len(word) - 1) if len(word) > 1 else 0

                x_offset = 60
                for j, char in enumerate(word):
                    draw.text((int(x_offset), y), char, font=body_font, fill=TEXT_COLOR)
                    char_bbox = draw.textbbox((0, 0), char, font=body_font)
                    x_offset += (char_bbox[2] - char_bbox[0]) + extra_space
            else:
                draw.text((60, y), word, font=body_font, fill=TEXT_COLOR)

        y += line_height
        if y > height - 80:
            break

    y += 9  # 段落间距(0.25倍行距)
    if y > height - 80:
        break

# 页码 - pie主题风格
draw.rounded_rectangle([width-120, height-45, width-40, height-20], radius=8, fill=LIGHT_BG)
page_text = "${cardNum}/${totalCards}"
draw.text((width-95, height-42), page_text, font=page_font, fill=(150, 150, 150))

img.save("${outputPath}", 'JPEG', quality=95)
print(f"✅ 卡片 ${cardNum}: ${outputPath}")
`;

  const tempPy = path.join(cardsDir, `temp_card_${cardNum}.py`);
  fs.writeFileSync(tempPy, pythonCode);

  try {
    execSync(`python3 "${tempPy}"`, { stdio: 'pipe' });
  } finally {
    if (fs.existsSync(tempPy)) {
      fs.unlinkSync(tempPy);
    }
    if (fs.existsSync(linesFile)) {
      fs.unlinkSync(linesFile);
    }
  }
}

// 步骤6:改写小红书文案
async function step6RewriteForXiaohongshu(article, topic) {
  console.log('\n🔄 步骤6: 改写小红书文案...');
  const startTime = Date.now();

  // 提取原标题
  const titleMatch = article.match(/^# (.+)$/m);
  const originalTitle = titleMatch ? titleMatch[1] : topic;

  // 生成爆款小红书标题(20字以内)
  const xhsTitle = generateXiaohongshuTitle(originalTitle, topic);

  // 提取正文(移除frontmatter)
  let content = article.replace(/^---[\s\S]*?---\n*/, '');
  content = content.replace(/^# .+\n/, '');

  // 生成小红书文案
  const contentMaxLength = CONFIG.xiaohongshu?.contentMaxLength || 1000;
  let xhsContent = content.substring(0, contentMaxLength);
  console.log(`   📝 原始长度: ${content.length} 字，截取后: ${xhsContent.length} 字`);

  // 添加emoji
  const emojiConfig = CONFIG.emoji?.replacements || {};
  for (const [key, value] of Object.entries(emojiConfig)) {
    xhsContent = xhsContent.replace(new RegExp(key, 'g'), value);
  }

  // 去AI味处理
  console.log('   → 去AI味处理...');
  try {
    const deAiPatterns = CONFIG.deAiPatterns || {};
    
    // 移除AI常用开头
    if (deAiPatterns.remove) {
      for (const pattern of deAiPatterns.remove) {
        xhsContent = xhsContent.replace(new RegExp(pattern, 'gm'), '');
      }
    }
    
    // 替换词汇
    if (deAiPatterns.replace) {
      for (const [pattern, replacement] of Object.entries(deAiPatterns.replace)) {
        xhsContent = xhsContent.replace(new RegExp(pattern, 'g'), replacement);
      }
    }
    
    // 替换标记词
    if (deAiPatterns.markers) {
      for (const [pattern, replacement] of Object.entries(deAiPatterns.markers)) {
        xhsContent = xhsContent.replace(new RegExp(`(${pattern})[，：]`, 'g'), `${replacement}`);
      }
    }
    
    xhsContent = xhsContent.trim();
    console.log('   ✅ 已去AI味');
  } catch (e) {
    console.log('   ⚠️  去AI味处理失败，使用原文:', e.message);
  }

  // 生成相关hashtag
  const hashtags = generateHashtags(topic);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ 小红书文案改写完成 (${duration}s)`);
  console.log(`   标题: ${xhsTitle}`);
  console.log(`   📄 正文长度: ${xhsContent.length} 字`);
  return {
    title: xhsTitle,
    content: xhsContent,
    hashtags
  };
}

// 生成爆款小红书标题
function generateXiaohongshuTitle(originalTitle, topic) {
  const titleMaxLength = CONFIG.xiaohongshu?.titleMaxLength || 20;
  const formulas = CONFIG.titleFormulas || [
    `3分钟读懂{topic}`,
    `{topic}|看完这篇就够了`,
    `终于有人把{topic}讲清楚了`,
    `{topic}?90%的人都理解错了`,
    `关于{topic},没人告诉你的真相`,
    `读完{topic},我悟了`,
    `{topic}|改变我人生的3个观点`
  ];

  // 替换模板变量
  const processedFormulas = formulas.map(f => 
    f.replace(/{topic}/g, topic.substring(0, 10))
  );

  // 添加原标题作为备选
  processedFormulas.push(originalTitle.substring(0, titleMaxLength));

  // 选择最合适的标题(优先长度10-20)
  for (const formula of processedFormulas) {
    if (formula.length <= titleMaxLength && formula.length >= 10) {
      return formula;
    }
  }

  return originalTitle.substring(0, titleMaxLength);
}

// 生成相关hashtag
function generateHashtags(topic) {
  // 提取关键词
  const keywords = topic.replace(/[^\u4e00-\u9fa5]/g, '').substring(0, 4);

  // 通用hashtag组合
  const baseTags = CONFIG.hashtags?.base || ['#干货分享', '#知识科普', '#必看', '#自我提升'];
  const topicTag = keywords ? `#${keywords}` : '#深度好文';

  return [topicTag, ...baseTags].join(' ');
}

// 步骤7:整理输出
function step7OrganizeOutput(topic, article, xiaohongshu, outputBaseDir) {
  console.log('\n📁 步骤7: 整理输出...');

  // 生成文件夹名:YYYYMMDD_小红书标题
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeTitle = xiaohongshu.title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '_').substring(0, 30);
  const folderName = `${date}_${safeTitle}`;
  const outputDir = path.join(outputBaseDir, folderName);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 创建子目录 - 简化结构
  const dirs = ['formatted', 'card'];
  for (const dir of dirs) {
    const dirPath = path.join(outputDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  console.log(`✅ 输出目录: ${outputDir}`);
  return outputDir;
}

// 保存所有文件
function saveAllFiles(outputDir, topic, article, prompt, analysis, xiaohongshu) {
  // 保存文章相关到 formatted/
  fs.writeFileSync(path.join(outputDir, 'formatted/article.md'), article);
  fs.writeFileSync(path.join(outputDir, 'formatted/prompt.txt'), prompt);
  fs.writeFileSync(path.join(outputDir, 'formatted/topic_analysis.json'), JSON.stringify(analysis, null, 2));

  // 保存小红书文案到单个文件 redbook_context.txt
  const redbookContent = `标题：${xiaohongshu.title}

正文：
${xiaohongshu.content}

标签：
${xiaohongshu.hashtags}
`;
  fs.writeFileSync(path.join(outputDir, 'redbook_context.txt'), redbookContent);

  // 创建简化的README
  const readme = `# ${xiaohongshu.title}

生成日期: ${new Date().toLocaleString()}
原始话题: ${topic}

## 文件说明

- formatted/ - 文章富文本（article.md, prompt.txt, topic_analysis.json）
- card/ - 卡片图片（card_01.png, card_02.png...）
- redbook_context.txt - 小红书文案（标题+正文+标签）

## 小红书发布指南

1. 使用 card/card_01.png 作为封面
2. 依次上传 card/ 中的所有卡片
3. 复制 redbook_context.txt 中的内容发布
`;
  fs.writeFileSync(path.join(outputDir, 'README.md'), readme);

  console.log('✅ 所有文件已保存');
}

// 主函数
async function main() {
  const options = parseArgs();

  if (!options.topic) {
    console.error('❌ 请提供话题关键词');
    console.log('用法: node main.js "话题" [--type story] [--theme Minimal]');
    process.exit(1);
  }

  console.log('🚀 小红书自动化图文生成技能');
  console.log('===========================');
  console.log(`话题: ${options.topic}`);
  console.log(`类型: ${options.type}`);
  console.log(`主题: ${options.theme}`);

  try {
    // 检查依赖
    checkDependencies();

    // 步骤1: 分析主题 + 生成提示词
    const { analysis, prompt } = step1AnalyzeAndGeneratePrompt(options.topic, options.type);

    // 步骤2: 撰写文章
    const article = await step2WriteArticle(prompt, options.topic);

    // 创建临时输出目录
    const tempDir = path.join(options.output, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 提取文章概要（前20字）
    const articleSummary = article.replace(/^---[\s\S]*?---\n*/, '').replace(/^# .+\n/, '').replace(/\n/g, ' ').substring(0, 20) + '...';

    // 提取标题
    const titleMatch = article.match(/^# (.+)$/m);
    const articleTitle = titleMatch ? titleMatch[1] : options.topic;
    
    // 步骤3 & 4: 封面图先生成，富文本并行
    console.log('\n⚡ 步骤3 & 4: 封面图生成 + 富文本并行...');
    
    // 先生成封面图（避免并发冲突）
    const coverPath = step4GenerateCover(options.topic, articleSummary, tempDir, articleTitle, article);
    
    // 再并行执行富文本转换
    const richTextPath = await step3ConvertToRichText(article, tempDir, options.theme);

    // 步骤5 & 6: 并行执行(生成卡片 + 改写小红书文案)
    console.log('\n⚡ 步骤5 & 6: 并行执行...');
    const [cardsDir, xiaohongshu] = await Promise.all([
      step5GenerateCards(article, tempDir, options.topic),
      step6RewriteForXiaohongshu(article, options.topic)
    ]);

    // 步骤7: 整理输出
    const finalOutputDir = step7OrganizeOutput(options.topic, article, xiaohongshu, options.output);

    // 移动文件到最终目录
    // 富文本
    if (fs.existsSync(richTextPath)) {
      fs.renameSync(richTextPath, path.join(finalOutputDir, 'formatted/article.html'));
    }
    
    // 移动文章到 formatted/
    if (fs.existsSync(path.join(tempDir, 'article.md'))) {
      fs.renameSync(path.join(tempDir, 'article.md'), path.join(finalOutputDir, 'formatted/article.md'));
    }

    // 移动封面图到 card/ (作为封面)
    if (coverPath && fs.existsSync(coverPath)) {
      const coverExt = path.extname(coverPath);
      fs.renameSync(coverPath, path.join(finalOutputDir, 'card', `cover${coverExt}`));
    }

    // 移动卡片到 card/
    if (cardsDir && fs.existsSync(cardsDir)) {
      const cardFiles = fs.readdirSync(cardsDir).filter(f => f.endsWith('.png'));
      for (const file of cardFiles) {
        fs.renameSync(path.join(cardsDir, file), path.join(finalOutputDir, 'card', file));
      }
      fs.rmdirSync(cardsDir);
    }

    // 保存小红书文案和其他文件
    saveAllFiles(finalOutputDir, options.topic, article, prompt, analysis, xiaohongshu);

    // 清理临时目录
    fs.rmSync(tempDir, { recursive: true, force: true });

    console.log('\n✅ 全部完成!');
    console.log(`📁 输出目录: ${finalOutputDir}`);
    console.log('\n文件结构:');
    console.log('  formatted/ - 文章富文本');
    console.log('  card/ - 卡片图片');
    console.log('  redbook_context.txt - 小红书文案');

  } catch (error) {
    console.error('\n❌ 执行失败:', error.message);
    process.exit(1);
  }
}

main();