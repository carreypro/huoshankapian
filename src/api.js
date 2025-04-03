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
              content: "你是一位专业的网页和营销视觉设计师，擅长创建精美的封面设计。请根据用户的要求，生成HTML、CSS和JavaScript代码来创建封面。请生成简洁且美观的代码，使用简单的HTML和CSS即可。"
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
 * 从生成的内容中提取HTML代码
 * @param {string} content - 生成的内容
 * @returns {string} - 提取的HTML代码
 */
function extractHtmlCode(content) {
  // 尝试提取HTML代码块
  const htmlRegex = /```html\s*([\s\S]*?)\s*```/;
  const htmlMatch = content.match(htmlRegex);
  
  if (htmlMatch && htmlMatch[1]) {
    return htmlMatch[1].trim();
  }
  
  // 如果没有找到HTML代码块，尝试提取任何代码块
  const codeRegex = /```(?:\w+)?\s*([\s\S]*?)\s*```/;
  const codeMatch = content.match(codeRegex);
  
  if (codeMatch && codeMatch[1]) {
    return codeMatch[1].trim();
  }
  
  // 如果没有找到代码块，返回原始内容
  return content;
}

/**
 * 将HTML代码保存到文件
 * @param {string} htmlCode - HTML代码
 * @param {string} fileName - 文件名
 * @returns {Promise<void>}
 */
async function saveHtmlToFile(htmlCode, fileName) {
  const fs = require('fs').promises;
  const path = require('path');
  
  // 确保covers目录存在
  const coversDir = path.join(process.cwd(), 'public', 'covers');
  try {
    await fs.mkdir(coversDir, { recursive: true });
  } catch (error) {
    console.error('创建covers目录失败:', error);
  }
  
  // 保存HTML文件
  const filePath = path.join(coversDir, fileName);
  await fs.writeFile(filePath, htmlCode, 'utf8');
  
  console.log(`封面HTML已保存到: ${filePath}`);
}

module.exports = {
  generateCoverImage
};
