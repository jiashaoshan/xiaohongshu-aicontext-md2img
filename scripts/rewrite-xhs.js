#!/usr/bin/env node
/**
 * 小红书文案网感化改写
 * 使用LLM进行真正的口语化改写，而非简单正则替换
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SKILL_DIR = path.dirname(path.dirname(__filename));

// 小红书风格改写提示词
const XHS_REWRITE_PROMPT = `你是一位资深小红书博主，擅长把正式文章改写成有"网感"的笔记。

## 改写要求

### 1. 语言风格
- 用**口语化短句**，模拟真人说话节奏
- 多用**"我"的视角**，加入个人感受
- 适当使用**网络流行语**（绝绝子、狠狠拿捏、emo、破防等）
- 打破长句，多用**断句和换行**制造呼吸感

### 2. 结构优化
- 开头用**钩子**（痛点、共鸣、好奇心）
- 中间用**emoji分段**，每段2-3句话
- 结尾**引导互动**（提问、求点赞、求收藏）

### 3. emoji使用
- 根据**内容语义**自然添加，不是机械插入
- 每段开头可用emoji标识段落主题
- 情绪词后加对应emoji增强表达

### 4. 禁止事项
- 不要保留"首先/其次/最后"等公文结构
- 不要出现"本文/笔者/研究表明"等书面语
- 不要堆砌专业术语，用大白话解释
- 不要保留原文的段落顺序，可以打乱重组

## 改写示例

**原文：**
人工智能技术的发展对社会产生了深远影响。它在医疗、教育、交通等领域展现出巨大潜力，但同时也带来了隐私安全和就业替代等问题。

**改写后：**
姐妹们，AI真的在偷偷改变我们的生活！😱

从看病问诊到孩子上学，从打车导航到刷短视频...AI无处不在✨

但说真的，我也挺慌的😰
- 隐私泄露？数据被卖？想想就emo
- 好多岗位被替代，35岁危机更焦虑了

不过换个角度想💡
与其被AI卷，不如学会用AI
现在的核心技能是：做AI做不到的事

你怎么看？评论区聊聊👇
#人工智能 #职场焦虑 #AI时代 #自我提升

---

现在请改写下面这篇文章，保留核心信息，但用小红书博主的口吻重写：

{{ARTICLE}}

---

输出格式要求：
1. 直接输出改写后的正文，不要任何解释
2. 字数控制在800-1000字
3. 确保有开头钩子、中间内容、结尾互动`;

// 生成小红书标题提示词
const XHS_TITLE_PROMPT = `你是一位小红书标题党高手。

根据以下文章主题，生成5个小红书风格的标题，要求：
1. 带数字或具体利益点（"3个方法"、"5分钟看懂"）
2. 制造好奇心或紧迫感
3. 不超过20个字
4. 口语化，像朋友聊天

主题：{{TOPIC}}

直接输出5个标题，每行一个，不加序号。`;

/**
 * 调用LLM改写文案
 */
async function rewriteWithLLM(article, topic) {
  console.log('   → 调用LLM进行网感化改写...');
  
  const prompt = XHS_REWRITE_PROMPT.replace('{{ARTICLE}}', article);
  
  try {
    // 使用 openclaw agent 调用 creator
    const escapedPrompt = prompt.replace(/'/g, "'\\''");
    const cmd = `openclaw agent --agent creator -m '${escapedPrompt}' --json --timeout 300`;
    
    const result = execSync(cmd, {
      encoding: 'utf-8',
      maxBuffer: 5 * 1024 * 1024,
      timeout: 300000
    });
    
    // 解析结果
    let content = '';
    try {
      const response = JSON.parse(result);
      if (response.result && response.result.payloads) {
        content = response.result.payloads.map(p => p.text || '').join('\n');
      } else if (response.text) {
        content = response.text;
      } else {
        content = result;
      }
    } catch (e) {
      content = result;
    }
    
    // 清理可能的提示词残留
    content = content.replace(/^以下是改写后的[内容文案][:：]?\s*/i, '');
    content = content.replace(/^改写后[:：]?\s*/i, '');
    content = content.trim();
    
    return content;
  } catch (error) {
    console.error('   ❌ LLM改写失败:', error.message);
    throw error;
  }
}

/**
 * 生成小红书标题
 */
async function generateTitleWithLLM(topic, articleTitle) {
  console.log('   → 生成小红书风格标题...');
  
  const prompt = XHS_TITLE_PROMPT
    .replace('{{TOPIC}}', topic)
    .replace('{{TITLE}}', articleTitle);
  
  try {
    const escapedPrompt = prompt.replace(/'/g, "'\\''");
    const cmd = `openclaw agent --agent creator -m '${escapedPrompt}' --json --timeout 120`;
    
    const result = execSync(cmd, {
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024,
      timeout: 120000
    });
    
    let content = '';
    try {
      const response = JSON.parse(result);
      if (response.result && response.result.payloads) {
        content = response.result.payloads.map(p => p.text || '').join('\n');
      } else {
        content = result;
      }
    } catch (e) {
      content = result;
    }
    
    // 提取标题列表
    const titles = content
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 5 && t.length <= 20);
    
    if (titles.length > 0) {
      // 随机选一个，避免每次都一样
      return titles[Math.floor(Math.random() * titles.length)];
    }
    
    return articleTitle.substring(0, 20);
  } catch (error) {
    console.error('   ⚠️ 标题生成失败，使用原标题:', error.message);
    return articleTitle.substring(0, 20);
  }
}

/**
 * 生成hashtag
 */
function generateHashtags(topic) {
  const cleanTopic = topic
    .replace(/^(如何|怎样|为什么|什么|哪里|哪个|推荐|适合|最好)/, '')
    .replace(/(攻略|指南|详解|深度)/g, '')
    .trim()
    .substring(0, 6);
  
  const baseTags = ['#干货分享', '#知识科普', '#必看', '#自我提升'];
  const topicTag = cleanTopic ? `#${cleanTopic}` : '#深度好文';
  
  return [topicTag, ...baseTags].join(' ');
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('用法: node rewrite-xhs.js <article.md> <topic>');
    process.exit(1);
  }
  
  const articlePath = args[0];
  const topic = args[1];
  
  if (!fs.existsSync(articlePath)) {
    console.error(`文章文件不存在: ${articlePath}`);
    process.exit(1);
  }
  
  console.log('🔄 小红书文案网感化改写');
  console.log('======================');
  console.log(`话题: ${topic}`);
  
  // 读取文章
  const article = fs.readFileSync(articlePath, 'utf-8');
  const titleMatch = article.match(/^# (.+)$/m);
  const articleTitle = titleMatch ? titleMatch[1] : topic;
  
  // 清理文章内容
  let cleanArticle = article
    .replace(/^---[\s\S]*?---\n*/, '')
    .replace(/^# .+\n/, '')
    .trim();
  
  console.log(`   📄 原文长度: ${cleanArticle.length} 字`);
  
  try {
    // 生成标题
    const xhsTitle = await generateTitleWithLLM(topic, articleTitle);
    console.log(`   📝 生成标题: ${xhsTitle}`);
    
    // LLM改写
    const xhsContent = await rewriteWithLLM(cleanArticle, topic);
    console.log(`   ✅ 改写完成，新长度: ${xhsContent.length} 字`);
    
    // 生成hashtag
    const hashtags = generateHashtags(topic);
    
    // 输出结果
    const output = {
      title: xhsTitle,
      content: xhsContent,
      hashtags: hashtags
    };
    
    console.log('\n🎉 改写完成!');
    console.log(`标题: ${output.title}`);
    console.log(`\n正文预览 (前200字):`);
    console.log(output.content.substring(0, 200) + '...');
    
    // 输出JSON到stdout
    console.log('\n---JSON_OUTPUT---');
    console.log(JSON.stringify(output, null, 2));
    
  } catch (error) {
    console.error('\n❌ 改写失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { rewriteWithLLM, generateTitleWithLLM };
