/**
 * DeepSeek API调用封装
 * 负责与DeepSeek API通信，发送请求并处理响应
 */

const axios = require('axios');
require('dotenv').config();

// DeepSeek API配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';  // DeepSeek聊天API端点

/**
 * 生成封面代码
 * @param {string} text - 用户输入的文字
 * @param {string} defaultPrompt - 默认提示词
 * @param {Object} style - 风格提示词对象，包含name和prompt属性
 * @returns {Promise<Object>} - 返回包含生成的HTML代码的对象
 */
/**
 * 尝试调用API，并在失败时自动重试
 * @param {Function} apiCall - 要调用的API函数
 * @param {number} maxRetries - 最大重试次数
 * @param {number} initialDelay - 初始重试延迟（毫秒）
 * @returns {Promise<any>} - API调用结果
 */
async function retryApiCall(apiCall, maxRetries = 2, initialDelay = 2000) {
  let lastError;
  let retryCount = 0;
  
  while (retryCount <= maxRetries) {
    try {
      if (retryCount > 0) {
        console.log(`尝试第 ${retryCount} 次重试API调用...`);
      }
      const result = await apiCall();
      if (retryCount > 0) {
        console.log(`重试成功！`);
      }
      return result;
    } catch (error) {
      lastError = error;
      // 如果是最后一次重试，直接抛出错误
      if (retryCount >= maxRetries) {
        throw error;
      }
      
      // 使用指数退避策略计算下一次重试的延迟
      const delay = initialDelay * Math.pow(2, retryCount);
      console.log(`API调用失败：${error.message}，${delay/1000}秒后将重试...`);
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, delay));
      retryCount++;
    }
  }
  
  // 如果所有重试都失败，抛出最后一个错误
  throw lastError;
}

async function generateCoverImage(text, defaultPrompt, style) {
  try {
    // 替换提示词模板中的占位符
    const formattedDefaultPrompt = defaultPrompt.replace('{text}', text);
    
    // 组合完整提示词
    const fullPrompt = `${formattedDefaultPrompt}\n\n风格要求：${style.prompt}`;
    
    console.log('发送到DeepSeek的完整提示词:', fullPrompt);
    
    // 设置超时时间为90秒，模型生成可能需要更长时间
    const timeoutMs = 90000;
    console.log(`设置API请求超时: ${timeoutMs/1000}秒`);
    
    // 使用重试机制调用API
    const response = await retryApiCall(async () => {
      return await axios.post(
        DEEPSEEK_API_URL,
        {
          model: "deepseek-chat",  // 使用DeepSeek聊天模型
          messages: [
            {
              role: "system", 
              content: "你是一位专业的网页设计师。我需要你直接输出一段纯HTML代码，用于创建一个精美的封面图片。这段代码将被直接用于渲染，不需要任何额外的标记或说明。\n\n严格遵守这些规则：\n1. 仅输出纯HTML代码，不要包含任何代码块标记、引号或其他非HTML内容\n2. 不要输出任何```、```html、\"html\"或'html'等标记\n3. 不要包含任何解释、注释或额外文本\n4. 代码必须以<开头，以>结尾\n5. 使用内联CSS样式，确保设计美观"
            },
            {
              role: "user", 
              content: fullPrompt
            }
          ],
          temperature: 0.7,  // 控制创意程度
          max_tokens: 4000,  // 返回足够长的回复以包含完整代码
          stream: false      // 非流式响应
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
          },
          timeout: timeoutMs // 设置请求超时
        }
      );
    }, 2, 2000); // 最多重试2次，初始等待2秒
    
    console.log('成功接收到DeepSeek API响应');
    
    // 从响应中提取生成的代码
    const generatedContent = response.data.choices[0].message.content;
    
    // 解析生成的内容，提取HTML代码
    const htmlCode = extractHtmlCode(generatedContent);
    
    // 生成一个唯一的文件名
    const fileName = `cover_${Date.now()}.html`;
    const filePath = `/covers/${fileName}`;
    
    // 将HTML代码保存到文件
    await saveHtmlToFile(htmlCode, fileName);
    
    // 返回生成的封面信息
    return {
      success: true,
      coverCode: htmlCode,
      coverUrl: filePath,
      style: style.name
    };
  } catch (error) {
    console.error('调用DeepSeek API出错:', error.message);
    let errorMessage = '生成封面时发生未知错误';
    
    // 处理不同类型的错误
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error('DeepSeek API请求超时');
      errorMessage = '生成封面超时，请稍后再试或尝试简化输入文字';
    } else if (error.response) {
      // API服务器返回了错误状态码
      console.error(`API返回错误状态码：${error.response.status}`);
      
      if (error.response.status === 429) {
        errorMessage = 'API调用次数超限，请稍候再试';
      } else if (error.response.status === 401 || error.response.status === 403) {
        errorMessage = 'API认证失败，请检查API密钥配置';
      } else {
        errorMessage = `API服务器错误 (${error.response.status}): ${error.response.data?.error || error.message}`;
      }
    } else if (error.request) {
      // 请求已发送但没有收到响应
      console.error('没有收到API响应');
      errorMessage = '无法连接到DeepSeek服务器，请检查网络连接';
    } else {
      // 请求设置出错
      console.error('请求设置错误:', error.message);
      errorMessage = `请求错误: ${error.message}`;
    }
    
    // 提供额外的用户提示，帮助用户解决问题
    let userTip = '';
    if (errorMessage.includes('超时')) {
      userTip = '提示：请尝试缩短输入文字，或选择其他风格再次生成。';
    } else if (errorMessage.includes('网络')) {
      userTip = '提示：请检查您的网络连接并刷新页面再试。';
    }
    
    // 返回详细的错误信息
    return {
      success: false,
      error: errorMessage,
      userTip: userTip
    };
  }
}

/**
 * 从生成的内容中提取并清理HTML代码
 * @param {string} content - 生成的内容
 * @returns {string} - 提取并清理后的HTML代码
 */
function extractHtmlCode(content) {
  // 防止空内容
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  // 清理整个原始内容的前后空白
  let result = content.trim();
  
  // 1. 第一阶段：先检查是否整个内容被代码块包围
  const fullCodeBlockRegex = /^[\s\n]*```(?:html|css|javascript)?[\s\n]*([\s\S]*?)[\s\n]*```[\s\n]*$/;
  const fullCodeBlockMatch = result.match(fullCodeBlockRegex);
  if (fullCodeBlockMatch && fullCodeBlockMatch[1]) {
    result = fullCodeBlockMatch[1].trim();
  }
  
  // 2. 检查是否整个内容被引号包围
  if ((result.startsWith('"') && result.endsWith('"')) || 
      (result.startsWith("'") && result.endsWith("'")) || 
      (result.startsWith('`') && result.endsWith('`'))) {
    result = result.substring(1, result.length - 1).trim();
  }
  
  // 3. 递归检查多层包装
  if ((result.startsWith('"') && result.endsWith('"')) || 
      (result.startsWith("'") && result.endsWith("'")) || 
      (result.startsWith('`') && result.endsWith('`')) ||
      result.startsWith('```') || result.endsWith('```')) {
    result = extractHtmlCode(result); // 递归处理
    return result; // 已完成递归清理，直接返回
  }
  
  // 4. 尝试提取HTML标签部分
  let htmlContent = '';
  
  // 查找第一个<标签开始和最后一个>标签结束
  const firstLT = result.indexOf('<');
  const lastGT = result.lastIndexOf('>');
  
  if (firstLT !== -1 && lastGT !== -1 && lastGT > firstLT) {
    // 提取<...>部分
    htmlContent = result.substring(firstLT, lastGT + 1);
  } else {
    // 如果没有找到完整的HTML标签，则使用清理后的原始内容
    htmlContent = result;
  }
  
  // 5. 应用所有清理规则
  return cleanHtmlString(htmlContent);
}

/**
 * 彻底清理HTML字符串中的所有代码标记和非HTML内容
 * @param {string} htmlString - 需要清理的HTML字符串
 * @returns {string} - 清理后的纯HTML字符串
 */
function cleanHtmlString(htmlString) {
  if (!htmlString) return '';
  
  return htmlString
    // 移除所有代码块标记
    .replace(/```(?:\w+)?|```/g, '')
    
    // 移除开头的"html:"、'html:'等标记
    .replace(/^[\s\n]*["'`]*\s*html\s*[:：]?\s*/i, '')
    .replace(/^[\s\n]*["'`]*\s*\\?["'`]html\s*[:：]?\s*/i, '')
    
    // 移除HTML注释
    .replace(/<!--[\s\S]*?-->/g, '')
    
    // 清理每一行
    .split('\n')
    .map(line => {
      return line
        // 移除每行开头的引号和html标记
        .replace(/^\s*["'`]+\s*(?:html\s*[:：]?\s*)?/i, '')
        // 移除每行结尾的引号
        .replace(/\s*["'`]+\s*$/g, '')
        // 移除每行中间可能出现的html:前缀
        .replace(/["'`]*html["'`]*\s*[:：]\s*/gi, '')
        // 移除可能的转义字符和引号组合
        .replace(/\\["'`]html/g, '')
        .replace(/["'`]html/g, '')
        .replace(/html["'`]/g, '');
    })
    .join('\n')
    
    // 再次清理整体
    .replace(/^[\s\n]*["'`]{1,3}|["'`]{1,3}[\s\n]*$/g, '') // 移除整体的引号包裹
    .replace(/^\s*html\s*$/gim, '') // 移除单独的html行
    .replace(/html```/g, '') // 移除可能的混合标记
    .replace(/```html/g, '') // 移除可能的混合标记
    .trim();
}

/**
 * 保存前最终验证HTML是否干净
 * @param {string} html - 待保存的HTML
 * @returns {string} - 最终干净的HTML
 */
function ensureCleanHtml(html) {
  if (!html) return '';
  
  // 如果HTML不是以<开头且以>结尾，则尝试提取有效部分
  if (!html.trim().startsWith('<') || !html.trim().endsWith('>')) {
    const validHtmlRegex = /<[\s\S]*?>/;
    const match = html.match(validHtmlRegex);
    if (match) {
      return match[0];
    }
  }
  
  // 如果发现HTML边缘有问题，进行额外清理
  let result = html.trim();
  
  // 清理开头
  while ((!result.startsWith('<') || result.startsWith('<"') || result.startsWith("<'") || 
          result.startsWith('<`') || result.startsWith('<html')) && result.includes('<')) {
    // 找到第一个有效的<位置
    const validStart = result.indexOf('<');
    if (validStart > 0) {
      result = result.substring(validStart);
    } else {
      // 无法找到有效的开始，跳出循环
      break;
    }
  }
  
  // 清理结尾
  while ((!result.endsWith('>') || result.endsWith('">') || result.endsWith("'>") || 
          result.endsWith('`>') || result.endsWith('html>')) && result.includes('>')) {
    // 找到最后一个有效的>位置
    const validEnd = result.lastIndexOf('>');
    if (validEnd > 0 && validEnd < result.length - 1) {
      result = result.substring(0, validEnd + 1);
    } else {
      // 无法找到有效的结束，跳出循环
      break;
    }
  }
  
  return result.trim();
}

/**
 * 将HTML代码保存到文件前进行最终清理
 * @param {string} htmlCode - HTML代码
 * @param {string} fileName - 文件名
 * @returns {Promise<void>}
 */
async function saveHtmlToFile(htmlCode, fileName) {
  const fs = require('fs').promises;
  const path = require('path');
  
  // 最终清理，确保HTML完全干净
  const finalCleanHtml = ensureCleanHtml(htmlCode);
  
  // 确保covers目录存在
  const coversDir = path.join(process.cwd(), 'public', 'covers');
  try {
    await fs.mkdir(coversDir, { recursive: true });
  } catch (error) {
    console.error('创建covers目录失败:', error);
  }
  
  // 保存HTML文件
  const filePath = path.join(coversDir, fileName);
  await fs.writeFile(filePath, finalCleanHtml, 'utf8');
  
  console.log(`封面HTML已保存到: ${filePath}`);
}

module.exports = {
  generateCoverImage
};
