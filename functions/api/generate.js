// 导入风格列表
import { stylePrompts } from '../../src/styles.js';

// 生成封面API
export async function onRequest(context) {
  try {
    // 获取请求数据
    const request = context.request;
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: '只支持POST请求' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Allow': 'POST'
        },
      });
    }

    // 解析请求体
    const requestData = await request.json();
    const { title, content, style } = requestData;

    if (!title || !content) {
      return new Response(JSON.stringify({ 
        success: false,
        error: '标题和内容不能为空' 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // 获取风格提示词
    let stylePrompt = '';
    if (style && style !== 'random') {
      const selectedStyle = stylePrompts.find(s => s.name === style);
      if (selectedStyle) {
        stylePrompt = selectedStyle.prompt;
      }
    } else {
      // 随机选择风格
      const randomIndex = Math.floor(Math.random() * stylePrompts.length);
      stylePrompt = stylePrompts[randomIndex].prompt;
    }

    // 在Cloudflare环境中，我们需要调用外部API
    // 直接使用API密钥
    let apiKey = 'sk-66b10c028b0348f4a8fe81bff7ff1195';
    // 如果环境变量中有API密钥，优先使用环境变量中的密钥
    if (context.env && context.env.DEEPSEEK_API_KEY) {
      apiKey = context.env.DEEPSEEK_API_KEY;
    }

    // 构建请求体
    const prompt = `
      请为以下内容设计一个精美的封面HTML代码:
      标题: ${title}
      内容: ${content}
      风格要求: ${stylePrompt}
      
      要求:
      1. 只返回HTML代码，不要包含任何解释或其他内容
      2. 代码必须是完整的HTML文档，包含<!DOCTYPE html>、<html>、<head>和<body>标签
      3. 所有样式必须内联在HTML文件中，不要使用外部CSS文件
      4. 不要包含任何JavaScript代码
      5. 设计应该是响应式的，适应不同屏幕尺寸
      6. 设计要符合上述风格要求
      7. 不要包含任何外部资源链接，所有资源必须内联
      8. 不要包含任何下载或保存按钮
    `;

    // 调用DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return new Response(JSON.stringify({ 
        success: false,
        error: '调用AI API失败', 
        details: errorData 
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const data = await response.json();
    const coverHtml = data.choices[0].message.content.trim();
    
    // 生成唯一ID
    const coverId = Date.now().toString();
    
    // 返回生成的封面HTML
    return new Response(JSON.stringify({ 
      success: true,
      coverId,
      style: style || 'random',
      coverCode: coverHtml  // 改名为 coverCode 以匹配前端期望
    }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false,
      error: '生成封面失败', 
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
