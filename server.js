/**
 * AI封面生成器服务器
 * 处理前端请求，调用DeepSeek API生成封面HTML代码
 */

// 加载环境变量
require('./env.js');

const express = require('express');
const cors = require('cors');
const path = require('path');
// 保留dotenv配置以兼容原有代码
require('dotenv').config();

// 导入自定义模块
const { defaultPrompt } = require('./src/prompts');
const { getRandomStyle, stylePrompts } = require('./src/styles');
const { generateCoverImage } = require('./src/api');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 创建covers目录用于存储生成的封面HTML文件
const fs = require('fs');
const coversDir = path.join(__dirname, 'public', 'covers');
if (!fs.existsSync(coversDir)) {
  fs.mkdirSync(coversDir, { recursive: true });
  console.log('创建covers目录:', coversDir);
}

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI封面生成器服务运行正常' });
});

/**
 * 获取风格列表API
 * 返回所有可用的风格选项
 */
app.get('/api/styles', (req, res) => {
  try {
    // 返回所有风格的名称和简要描述
    const styles = stylePrompts.map(style => ({
      name: style.name,
      // 创建简短描述，截取提示词的前50个字符
      description: style.prompt.substring(0, 50) + '...'
    }));
    
    res.json({
      success: true,
      styles: styles
    });
  } catch (error) {
    console.error('获取风格列表出错:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * 生成封面API
 * 接收用户输入的文字，调用DeepSeek API生成封面HTML代码
 */
app.post('/api/generate', async (req, res) => {
  try {
    const { text, style } = req.body;
    
    // 验证输入
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '请提供有效的文字内容'
      });
    }
    
    console.log(`收到生成请求，文字内容: "${text}", 风格: ${style || '随机'}`);
    
    // 获取风格，如果指定了具体风格则使用，否则随机选择
    let selectedStyle;
    if (style && style !== 'random') {
      // 查找用户指定的风格
      selectedStyle = stylePrompts.find(s => s.name === style);
      if (!selectedStyle) {
        return res.status(400).json({
          success: false,
          error: `未找到指定的风格: ${style}`
        });
      }
      console.log(`使用用户选择的风格: ${selectedStyle.name}`);
    } else {
      // 随机选择风格
      selectedStyle = getRandomStyle();
      console.log(`随机选择的风格: ${selectedStyle.name}`);
    }
    
    // 调用API生成封面
    const result = await generateCoverImage(text, defaultPrompt, selectedStyle);
    
    // 返回结果
    if (result.success) {
      res.json({
        success: true,
        coverUrl: result.coverUrl,
        coverCode: result.coverCode,
        style: result.style
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || '生成封面失败'
      });
    }
  } catch (error) {
    console.error('处理请求时出错:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器已启动，访问 http://localhost:${PORT}`);
  console.log('API接口:');
  console.log(`- 健康检查: GET http://localhost:${PORT}/api/health`);
  console.log(`- 获取风格列表: GET http://localhost:${PORT}/api/styles`);
  console.log(`- 生成封面: POST http://localhost:${PORT}/api/generate`);
  console.log('DeepSeek API密钥:', process.env.DEEPSEEK_API_KEY ? '已配置' : '未配置');
});
