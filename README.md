# AI 封面生成器

这是一个基于 DeepSeek 大语言模型的 AI 生成封面 Web 应用。用户只需输入文字并点击生成按钮，系统会根据内置的提示词模板和随机选择的风格提示词，调用 DeepSeek 大模型生成精美的封面图片。

## 功能特点

- 简洁直观的用户界面
- 基于用户输入文字生成封面
- 自动融合默认提示词和随机风格提示词
- 多种风格选择，每次生成都有惊喜
- 生成后可直接下载PNG格式的高质量封面图片
- 界面简洁，移除了生成封面内部的重复保存按钮
- 响应式布局设计：桌面端左右并排布局，移动端上下排列，优化不同设备体验

## 使用方法

1. 在输入框中输入你想要的封面文字内容
2. 点击"生成封面"按钮
3. 等待几秒钟，系统会自动生成封面
4. 点击"下载"按钮保存生成的封面图片

## 技术架构

- 前端：HTML, CSS, JavaScript
- 后端：Node.js, Express
- AI模型：DeepSeek 大语言模型
- 部署：可本地运行或部署到服务器

## 项目结构

```
/
├── README.md          # 项目说明文档
├── package.json       # 项目依赖配置
├── server.js          # 服务器入口文件(本地开发)
├── wrangler.toml      # Cloudflare配置文件
├── public/            # 静态资源目录
│   ├── index.html     # 主页面
│   ├── _redirects     # Cloudflare Pages路由配置
│   ├── css/           # 样式文件
│   │   └── style.css  # 主样式表
│   ├── js/            # JavaScript文件
│   │   └── main.js    # 主逻辑脚本
│   └── images/        # 图片资源
├── functions/         # Cloudflare Functions
│   ├── _middleware.js # 请求处理中间件
│   └── api/           # API端点
│       ├── health.js  # 健康检查API
│       ├── styles.js  # 风格列表API
│       └── generate.js# 生成封面API
├── src/               # 源代码目录
│   ├── prompts.js     # 提示词模板
│   └── styles.js      # 风格提示词
└── .env               # 环境变量(不提交到版本控制)
```

## 安装与运行

### 本地开发

1. 克隆项目到本地
2. 安装依赖：`npm install`
3. 配置DeepSeek API密钥：在根目录创建`.env`文件并添加`DEEPSEEK_API_KEY=你的API密钥`
4. 启动服务器：`npm start`
5. 打开浏览器访问：`http://localhost:3000`

### Cloudflare部署

本项目支持将前后端都部署到Cloudflare上，利用Cloudflare Pages托管静态资源，Cloudflare Functions提供API服务。

1. 安装Cloudflare Wrangler CLI：`npm install -g wrangler`
2. 登录Cloudflare账号：`wrangler login`
3. 本地测试Cloudflare部署：`npm run dev:cf`
4. 部署到Cloudflare Pages：`npm run deploy`
5. 在Cloudflare Dashboard中设置环境变量：
   - 进入你的Pages项目 > Settings > Environment variables
   - 添加`DEEPSEEK_API_KEY`环境变量，值为你的DeepSeek API密钥

部署完成后，你可以通过Cloudflare提供的域名访问你的应用。

## 提示词系统

本应用使用两类提示词：

1. **默认提示词**：为每次生成提供基础指导，确保生成的封面具有高质量和一致性
2. **风格提示词**：多种不同的艺术风格，每次生成时随机选择一种，增加多样性和创意性

系统会自动将用户输入的文字、默认提示词和随机选择的风格提示词组合，形成完整的提示发送给DeepSeek模型。

## 更新日志

### 2025年4月3日

- **新功能**: 封面现在可以直接下载为PNG格式，而不是之前的HTML文件
- **界面优化**: 移除了生成封面内部的重复保存按钮，使界面更加简洁
- **响应式布局**: 实现桌面端创作起点和创作成果左右并排显示，移动端保持上下布局
- **视觉交互**: 添加平滑过渡和动画效果，提升用户体验
- **技术改进**: 使用html2canvas库将HTML内容转换为高质量PNG图片
- **本地开发**: 修复了本地开发环境中风格列表不加载的问题
- **云部署**: 添加了Cloudflare Pages和Functions部署支持，实现前后端一体化部署
