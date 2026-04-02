#!/usr/bin/env node
/**
 * 小红书自动化图文生成技能 - 主脚本
 * 7步工作流:分析→生成→排版→封面→分页→改写→整理
 * 
 * 修改: 使用 openclaw agent 调用笔杆子 agent 生成文章
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SKILL_DIR = path.dirname(path.dirname(__filename));
const WECHAT_PROMPT = path.join(process.env.HOME, '.openclaw/workspace/skills/wechat-prompt-context');
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
    { path: Z_CARD_IMAGE, name: 'z-card-image' }
  ];

  for (const dep of deps) {
    if (!fs.existsSync(dep.path)) {
      console.error(`❌ 缺少依赖: ${dep.name}`);
      process.exit(1);
    }
  }

  console.log('✅ 依赖检查通过');
}

// 步骤1:分析主题 + 生成提示词 - 使用AI分析
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

// 步骤2:撰写文章 - 使用 openclaw agent 调用笔杆子 agent
async function step2WriteArticle(prompt, topic) {
  console.log('\n✍️  步骤2: 撰写完整文章...');
  console.log('   → 调用笔杆子 agent 生成文章...');
  const startTime = Date.now();

  try {
    // 准备提示词
    const fullPrompt = `${prompt}

重要提示：
1. 直接输出文章内容，不要包含任何解释、思考过程或前言
2. 不要使用"让我开始写作"、"以下是关于"等提示词语言
3. 从正文标题开始直接写，不要写创作思路或分析
4. 文章开头直接是 # 标题，然后是正文内容`;

    // 保存提示词到文件
    const promptPath = path.join(WECHAT_PROMPT, 'output/generated_prompt.txt');
    fs.writeFileSync(promptPath, fullPrompt, 'utf-8');

    // 读取提示词内容
    const promptContent = fs.readFileSync(promptPath, 'utf-8');
    
    // 使用 openclaw agent 调用笔杆子 agent
    const openclawCmd = `openclaw agent --agent creator -m '${promptContent.replace(/'/g, "'\\''")}' --json --timeout 600`;
    
    console.log('   → 等待笔杆子 agent 生成...');
    const result = execSync(openclawCmd, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB
      timeout: 600000 // 10分钟
    });

    // 解析返回结果
    let article = '';
    try {
      const response = JSON.parse(result);
      if (response.result && response.result.payloads && response.result.payloads.length > 0) {
        article = response.result.payloads.map(p => p.text || '').join('\n');
      } else if (response.text) {
        article = response.text;
      }
    } catch (e) {
      // 如果不是JSON格式，直接使用文本
      article = result;
    }

    // 清理文章 - 移除可能的提示词内容
    article = cleanArticleContent(article);

    // 保存到标准位置
    const articlePath = path.join(WECHAT_PROMPT, 'output/article.md');
    fs.writeFileSync(articlePath, article, 'utf-8');

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

// 清理文章内容，移除LLM提示词
function cleanArticleContent(article) {
  // 移除常见的LLM提示词开头
  const promptPatterns = [
    /我已经收到了用户的请求[\s\S]*?让我开始写作[：:]?\s*/,
    /我来为你撰写[\s\S]*?开始创作[：:]?\s*/,
    /以下是关于[\s\S]*?的文章[：:]?\s*/,
    /根据你的要求[\s\S]*?正文如下[：:]?\s*/,
    /我会按照要求[\s\S]*?开始写作[：:]?\s*/,
    /好的，我来[\s\S]*?开始[：:]?\s*/,
  ];
  
  let cleaned = article;
  for (const pattern of promptPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // 找到第一个 # 标题，保留之后的内容
  const titleMatch = cleaned.match(/^#[^#]/m);
  if (titleMatch && cleaned.indexOf(titleMatch[0]) > 0) {
    cleaned = cleaned.substring(cleaned.indexOf(titleMatch[0]));
  }
  
  return cleaned.trim();
}

// 步骤3:Markdown转富文本
async function step3ConvertToRichText(article, outputDir, theme) {
  console.log('\n📝 步骤3: 富文本转换...');
  const startTime = Date.now();

  try {
    // 保存文章到临时文件
    const articlePath = path.join(outputDir, 'article.md');
    fs.writeFileSync(articlePath, article, 'utf-8');

    // 使用 wenyan-cli 转换为富文本（新版不支持--theme）
    const outputPath = path.join(outputDir, 'article.html');
    const convertCmd = `wenyan convert "${articlePath}" --output "${outputPath}"`;
    
    execSync(convertCmd, { stdio: 'pipe' });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ 富文本转换完成(${theme}主题)`);

    return outputPath;
  } catch (error) {
    console.error('❌ 步骤3失败:', error.message);
    return article;
  }
}

// 步骤4:生成封面图(只保留主标题)
function step4GenerateCover(topic, summary, outputDir, title, article) {
  console.log('\n🖼️  步骤4: 生成封面图...');

  const coverPath = path.join(outputDir, 'cover.png');
  
  try {
    const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // 估算阅读时间
    const wordCount = article.length;
    const readTime = Math.max(1, Math.ceil(wordCount / 300));
    
    const cardStyle = CONFIG.cardStyle || {};
    const coverFooter = `字数 ${wordCount} | 阅读约 ${readTime} 分钟`;
    
    // 封面只用主标题，传入副标题作为文本内容
    const cmd = `python3 "${Z_CARD_IMAGE}/scripts/render_article.py" \
      --title "${safeTitle}" \
      --text "${subtitle || '点击查看详情'}" \
      --page-num 1 \
      --page-total 1 \
      --out "${coverPath}" \
      --footer "${coverFooter}" \
      --bg "${cardStyle.bgColor || '#ffffff'}" \
      --highlight "${cardStyle.highlightColor || '#E60012'}" \
      --cover`;
    
    execSync(cmd, { stdio: 'pipe', timeout: 60000 });
    console.log('   ✅ 封面渲染完成:', coverPath);
    
    if (fs.existsSync(coverPath)) {
      console.log('✅ 封面图生成完成');
      return coverPath;
    }
  } catch (error) {
    console.error('⚠️  封面生成失败:', error.message);
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
    cleanArticle = cleanArticle.trim();
    
    // 分页
    const charsPerPage = CONFIG.card?.charsPerPage || 320;
    const pages = splitArticleIntoPages(cleanArticle, charsPerPage);
    const totalPages = pages.length;
    
    console.log(`   📊 文章分 ${totalPages} 页`);

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
        const pageCharCount = pageContent.length;
        const pageReadTime = Math.max(1, Math.ceil(pageCharCount / 300));
        const pageFooter = `字数 ${pageCharCount} | 阅读约 ${pageReadTime} 分钟`;
        
        const cmd = `python3 "${Z_CARD_IMAGE}/scripts/render_article.py" \
          --title "${escapedTitle}" \
          --text "${escapedContent}" \
          --page-num ${pageNum} \
          --page-total ${totalPages} \
          --out "${cardPath}" \
          --footer "${pageFooter}" \
          --bg "${cardStyle.bgColor || '#ffffff'}" \
          --highlight "${cardStyle.highlightColor || '#E60012'}" \
          --chars-per-page ${cardStyle.charsPerPage || 350}`;
        
        execSync(cmd, { stdio: 'pipe', timeout: 60000 });
        
        if (fs.existsSync(cardPath)) {
          console.log(`   ✅ 卡片 ${pageNum}/${totalPages}`);
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

  // 生成小红书标题
  const xhsTitle = generateXiaohongshuTitle(originalTitle, topic);

  // 提取正文
  let content = article.replace(/^---[\s\S]*?---\n*/, '');
  content = content.replace(/^# .+\n/, '');
  content = cleanArticleContent(content);

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

// 生成小红书标题
function generateXiaohongshuTitle(originalTitle, topic) {
  const titleMaxLength = CONFIG.xiaohongshu?.titleMaxLength || 20;
  const formulas = CONFIG.titleFormulas || [
    `3分钟读懂{topic}`,
    `{topic}|看完这篇就够了`,
    `终于有人把{topic}讲清楚了`,
    `{topic}?90%的人都理解错了`
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

// 生成hashtag
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
function saveAllFiles(outputDir, topic, article, xiaohongshu) {
  fs.writeFileSync(path.join(outputDir, 'formatted/article.md'), article);

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
    
    // 等待5秒，避免 Rate Limit
    console.log('   ⏳ 等待5秒避免API限流...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
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

    saveAllFiles(finalOutputDir, options.topic, article, xiaohongshu);

    console.log('\n🎉 全部完成!');
    console.log(`📁 输出目录: ${finalOutputDir}`);

  } catch (error) {
    console.error('\n❌ 执行失败:', error.message);
    process.exit(1);
  }
}

main();