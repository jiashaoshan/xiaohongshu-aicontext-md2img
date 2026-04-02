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
    const promptCmd = `cd "${WECHAT_PROMPT}" && node scripts/generate-prompt.js "${topic}" ${type}`;
    execSync(promptCmd, { stdio: 'pipe' });

    // 读取提示词
    const promptPath = path.join(WECHAT_PROMPT, 'output/prompt.txt');
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

// 步骤2:撰写文章
async function step2WriteArticle(prompt, topic) {
  console.log('\n✍️  步骤2: 撰写完整文章...');
  const startTime = Date.now();

  try {
    // 调用 wechat-prompt-context 的 write-article.js
    console.log('   → 调用笔杆子 agent 生成文章...');
    const writeCmd = `cd "${WECHAT_PROMPT}" && node scripts/write-article.js`;
    
    // 将提示词写入文件
    const promptPath = path.join(WECHAT_PROMPT, 'output/prompt.txt');
    fs.writeFileSync(promptPath, prompt, 'utf-8');
    
    execSync(writeCmd, { stdio: 'pipe', timeout: 300000 });

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

// 步骤3:Markdown转富文本
async function step3ConvertToRichText(article, outputDir, theme) {
  console.log('\n📝 步骤3: 富文本转换...');
  const startTime = Date.now();

  try {
    // 保存文章到临时文件
    const articlePath = path.join(outputDir, 'article.md');
    fs.writeFileSync(articlePath, article, 'utf-8');

    // 使用 wenyan-cli 转换为富文本
    const outputPath = path.join(outputDir, 'article.html');
    const convertCmd = `wenyan convert "${articlePath}" --theme ${theme} --output "${outputPath}"`;
    
    execSync(convertCmd, { stdio: 'pipe' });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ 富文本转换完成(${theme}主题)`);

    return outputPath;
  } catch (error) {
    console.error('❌ 步骤3失败:', error.message);
    // 失败时返回原始markdown
    return article;
  }
}

// 步骤4:生成封面图(使用 z-card-image 生成标题页，只保留主标题)
function step4GenerateCover(topic, summary, outputDir, title, article) {
  console.log('\n🖼️  步骤4: 生成封面图...');

  const coverPath = path.join(outputDir, 'cover.png');
  
  try {
    const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // 估算阅读时间（按每分钟300字计算）
    const wordCount = article.length;
    const readTime = Math.max(1, Math.ceil(wordCount / 300));
    
    const cardStyle = CONFIG.cardStyle || {};
    const coverFooter = `字数 ${wordCount} | 阅读约 ${readTime} 分钟`;
    
    // 封面只用主标题，不传递副标题
    const cmd = `python3 "${Z_CARD_IMAGE}/scripts/render_article.py" \
      --title "${safeTitle}" \
      --text "" \
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
  }
  
  return null;
}

// 步骤5:动态分页 + 生成卡片
async function step5GenerateCards(article, outputDir, topic) {
  console.log('\n📄 步骤5: 动态分页 + 生成卡片...');
  const startTime = Date.now();

  try {
    // 清理文章
    let cleanArticle = article.replace(/^---[\s\S]*?---\n*/, '');
    const titleMatch = cleanArticle.match(/^# (.+)$/m);
    const title = titleMatch ? titleMatch[1] : topic;
    cleanArticle = cleanArticle.replace(/^# .+\n/, '');
    
    // 过滤LLM提示词
    const writingMatch = cleanArticle.match(/让我开始写作[：:]\s*#+\s+/);
    if (writingMatch) {
      const startIndex = cleanArticle.indexOf(writingMatch[0]) + writingMatch[0].length - 1;
      cleanArticle = cleanArticle.substring(startIndex);
    }
    
    const lines = cleanArticle.split('\n');
    let startIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.match(/^#{1,2}\s+/) && line.length > 3) {
        startIndex = i;
        break;
      }
    }
    cleanArticle = lines.slice(startIndex).join('\n');

    // 分页
    const charsPerPage = CONFIG.card?.charsPerPage || 320;
    const pages = splitArticleIntoPages(cleanArticle, charsPerPage);
    const totalPages = pages.length;
    
    console.log(`   📊 文章分 ${totalPages} 页`);
    console.log(`   📝 平均每页: ${Math.floor(cleanArticle.length / totalPages)} 字符`);

    // 生成卡片
    const cardsDir = path.join(outputDir, 'cards');
    if (!fs.existsSync(cardsDir)) {
      fs.mkdirSync(cardsDir, { recursive: true });
    }

    const tasks = [];
    for (let i = 0; i < totalPages; i++) {
      const cardPath = path.join(cardsDir, `card_${String(i + 1).padStart(2, '0')}.png`);
      
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

    // 并发生成
    const CONCURRENT_LIMIT = CONFIG.card?.concurrentLimit || 8;
    
    async function generateCard(task) {
      const { pageIndex, pageContent, cardPath, title, totalPages } = task;
      const pageNum = pageIndex + 1;
      
      try {
        const escapedContent = pageContent.replace(/"/g, '\\"');
        const escapedTitle = title.replace(/"/g, '\\"');
        
        const cardStyle = CONFIG.cardStyle || {};
        const showFooter = cardStyle.showFooter !== false;
        const pageCharCount = pageContent.length;
        const pageReadTime = Math.max(1, Math.ceil(pageCharCount / 300));
        const pageFooter = showFooter ? `字数 ${pageCharCount} | 阅读约 ${pageReadTime} 分钟` : '';
        
        const cmd = `python3 "${Z_CARD_IMAGE}/scripts/render_article.py" \
          --title "${escapedTitle}" \
          --text "${escapedContent}" \
          --page-num ${pageNum} \
          --page-total ${totalPages} \
          --out "${cardPath}" \
          --footer "${pageFooter}" \
          --bg "${cardStyle.bgColor || '#ffffff'}" \
          --highlight "${cardStyle.highlightColor || '#E60012'}" \
          --line-height ${cardStyle.lineHeight || 1.9} \
          --font-size ${cardStyle.fontSize || 28}`;
        
        execSync(cmd, { stdio: 'pipe', timeout: 60000 });
        
        if (fs.existsSync(cardPath)) {
          console.log(`   ✅ 卡片 ${pageNum}/${totalPages} (${pageIndex % CONCURRENT_LIMIT + 1}/${Math.min(tasks.length, CONCURRENT_LIMIT)})`);
          return true;
        }
      } catch (error) {
        console.error(`   ❌ 卡片 ${pageNum} 生成失败:`, error.message);
      }
      return false;
    }

    // 批量处理
    for (let i = 0; i < tasks.length; i += CONCURRENT_LIMIT) {
      const batch = tasks.slice(i, i + CONCURRENT_LIMIT);
      await Promise.all(batch.map(generateCard));
      
      if (i + CONCURRENT_LIMIT < tasks.length) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.card?.batchDelayMs || 500));
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ 生成完成 (${duration}s)`);
    console.log(`   📁 卡片目录: ${cardsDir}`);

    return cardsDir;
  } catch (error) {
    console.error('❌ 步骤5失败:', error.message);
    throw error;
  }
}

// 分页函数
function splitArticleIntoPages(article, charsPerPage) {
  const pages = [];
  const paragraphs = article.split('\n\n').filter(p => p.trim());
  
  let currentPage = '';
  let currentChars = 0;
  const safeCharsPerPage = Math.floor(charsPerPage * 0.9);
  
  for (const para of paragraphs) {
    const paraChars = para.length;
    
    if (currentChars + paraChars > safeCharsPerPage && currentPage) {
      pages.push(currentPage.trim());
      currentPage = para;
      currentChars = paraChars;
    } else {
      currentPage += '\n\n' + para;
      currentChars += paraChars;
    }
  }
  
  if (currentPage) {
    pages.push(currentPage.trim());
  }
  
  return pages.length > 0 ? pages : [article];
}

// 步骤6:改写小红书文案
async function step6RewriteForXiaohongshu(article, topic) {
  console.log('\n🔄 步骤6: 改写小红书文案...');
  const startTime = Date.now();

  // 提取原标题
  const titleMatch = article.match(/^# (.+)$/m);
  const originalTitle = titleMatch ? titleMatch[1] : topic;

  // 生成爆款小红书标题
  const xhsTitle = generateXiaohongshuTitle(originalTitle, topic);

  // 提取正文
  let content = article.replace(/^---[\s\S]*?---\n*/, '');
  content = content.replace(/^# .+\n/, '');

  // 过滤LLM提示词
  const writingMatch = content.match(/让我开始写作[：:]\s*#+\s+/);
  if (writingMatch) {
    const startIndex = content.indexOf(writingMatch[0]) + writingMatch[0].length - 1;
    content = content.substring(startIndex);
  }

  const promptPatterns = [
    /我已经收到了用户的请求[\s\S]*?让我开始写作[：:]?\s*/,
    /我来为你撰写[\s\S]*?开始创作[：:]?\s*/,
    /以下是关于[\s\S]*?的文章[：:]?\s*/,
    /根据你的要求[\s\S]*?正文如下[：:]?\s*/,
  ];
  for (const pattern of promptPatterns) {
    content = content.replace(pattern, '');
  }

  const lines = content.split('\n');
  let startIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.match(/^#{1,2}\s+/) && line.length > 3) {
      startIndex = i;
      break;
    }
  }
  content = lines.slice(startIndex).join('\n');

  // 截取1000字以内
  const contentMaxLength = CONFIG.xiaohongshu?.contentMaxLength || 1000;
  let xhsContent = content.substring(0, contentMaxLength);
  console.log(`   📝 原始长度: ${content.length} 字，截取后: ${xhsContent.length} 字`);

  // 去AI味处理
  console.log('   → 去AI味处理...');
  try {
    const deAiPatterns = CONFIG.deAiPatterns || {};
    
    if (deAiPatterns.remove) {
      for (const pattern of deAiPatterns.remove) {
        xhsContent = xhsContent.replace(new RegExp(pattern, 'gm'), '');
      }
    }
    
    if (deAiPatterns.replace) {
      for (const [pattern, replacement] of Object.entries(deAiPatterns.replace)) {
        xhsContent = xhsContent.replace(new RegExp(pattern, 'g'), replacement);
      }
    }
    
    xhsContent = xhsContent.trim();
    console.log('   ✅ 已去AI味');
  } catch (e) {
    console.log('   ⚠️  去AI味处理失败:', e.message);
  }

  // 生成hashtag
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

  const processedFormulas = formulas.map(f => 
    f.replace(/{topic}/g, topic.substring(0, 10))
  );

  processedFormulas.push(originalTitle.substring(0, titleMaxLength));

  for (const formula of processedFormulas) {
    if (formula.length <= titleMaxLength && formula.length >= 10) {
      return formula;
    }
  }

  return originalTitle.substring(0, titleMaxLength);
}

// 生成相关hashtag
function generateHashtags(topic) {
  let keywords = '';
  
  const cleanTopic = topic
    .replace(/^(如何|怎样|为什么|什么|哪里|哪个|推荐|适合|最好)/, '')
    .replace(/(最好|推荐|适合|攻略|指南|详解|深度)/g, '')
    .trim();
  
  const chineseChars = cleanTopic.match(/[\u4e00-\u9fa5]+/g);
  if (chineseChars && chineseChars.length > 0) {
    const longestSegment = chineseChars.sort((a, b) => b.length - a.length)[0];
    keywords = longestSegment.substring(0, 6);
  }
  
  if (!keywords) {
    keywords = '深度好文';
  }

  const baseTags = CONFIG.hashtags?.base || ['#干货分享', '#知识科普', '#必看', '#自我提升'];
  const topicTag = `#${keywords}`;

  return [topicTag, ...baseTags].join(' ');
}

// 步骤7:整理输出
function step7OrganizeOutput(topic, article, xiaohongshu, outputBaseDir) {
  console.log('\n📁 步骤7: 整理输出...');

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeTitle = xiaohongshu.title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '_').substring(0, 30);
  const folderName = `${date}_${safeTitle}`;
  const outputDir = path.join(outputBaseDir, folderName);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

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
  fs.writeFileSync(path.join(outputDir, 'formatted/article.md'), article);
  fs.writeFileSync(path.join(outputDir, 'formatted/prompt.txt'), prompt);
  fs.writeFileSync(path.join(outputDir, 'formatted/topic_analysis.json'), JSON.stringify(analysis, null, 2));

  const redbookContent = `标题：${xiaohongshu.title}

正文：
${xiaohongshu.content}

标签：
${xiaohongshu.hashtags}
`;
  fs.writeFileSync(path.join(outputDir, 'redbook_context.txt'), redbookContent);

  const readme = `# ${xiaohongshu.title}

生成日期: ${new Date().toLocaleString()}
原始话题: ${topic}

## 文件说明

- formatted/ - 文章富文本
- card/ - 卡片图片
- redbook_context.txt - 小红书文案

## 小红书发布指南

1. 使用 card/cover.png 作为封面
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
    console.log('用法: node main.js "话题"');
    process.exit(1);
  }

  console.log('🚀 小红书自动化图文生成技能');
  console.log('===========================');
  console.log(`话题: ${options.topic}`);

  try {
    checkDependencies();

    const { analysis, prompt } = step1AnalyzeAndGeneratePrompt(options.topic, options.type);
    const article = await step2WriteArticle(prompt, options.topic);

    const tempDir = path.join(options.output, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const articleSummary = article.replace(/^---[\s\S]*?---\n*/, '').replace(/^# .+\n/, '').replace(/\n/g, ' ').substring(0, 20) + '...';
    const titleMatch = article.match(/^# (.+)$/m);
    const articleTitle = titleMatch ? titleMatch[1] : options.topic;
    
    const richTextPath = await step3ConvertToRichText(article, tempDir, options.theme);

    const [cardsDir, xiaohongshu] = await Promise.all([
      step5GenerateCards(article, tempDir, options.topic),
      step6RewriteForXiaohongshu(article, options.topic)
    ]);
    
    const xiaohongshuTitle = xiaohongshu.title || articleTitle;
    const coverPath = step4GenerateCover(options.topic, articleSummary, tempDir, xiaohongshuTitle, article);

    const finalOutputDir = step7OrganizeOutput(options.topic, article, xiaohongshu, options.output);

    if (richTextPath && fs.existsSync(richTextPath)) {
      fs.renameSync(richTextPath, path.join(finalOutputDir, 'formatted/article.html'));
    }
    
    if (fs.existsSync(path.join(tempDir, 'article.md'))) {
      fs.renameSync(path.join(tempDir, 'article.md'), path.join(finalOutputDir, 'formatted/article.md'));
    }

    if (coverPath && fs.existsSync(coverPath)) {
      const coverExt = path.extname(coverPath);
      fs.renameSync(coverPath, path.join(finalOutputDir, 'card', `cover${coverExt}`));
    }

    if (cardsDir && fs.existsSync(cardsDir)) {
      const cardFiles = fs.readdirSync(cardsDir).filter(f => f.endsWith('.png'));
      for (const file of cardFiles) {
        fs.renameSync(path.join(cardsDir, file), path.join(finalOutputDir, 'card', file));
      }
      fs.rmdirSync(cardsDir);
    }

    fs.writeFileSync(path.join(tempDir, 'prompt.txt'), prompt);
    fs.writeFileSync(path.join(tempDir, 'topic_analysis.json'), JSON.stringify(analysis, null, 2));
    
    saveAllFiles(finalOutputDir, options.topic, article, prompt, analysis, xiaohongshu);

    console.log('\n🎉 全部完成!');
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