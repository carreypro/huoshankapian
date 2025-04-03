/**
 * AI封面生成器前端脚本
 * 实现与后端API的交互以及用户界面交互效果
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('页面加载完成，开始初始化...');
  
  // 全局变量声明，以便在各函数中使用
  window.coverTextInput = document.getElementById('cover-text');
  window.styleSelect = document.getElementById('style-select');
  window.generateBtn = document.getElementById('generate-btn');
  window.resultSection = document.getElementById('result-section');
  window.loadingContainer = document.getElementById('loading-container');
  window.resultContainer = document.getElementById('result-container');
  window.resultImage = document.getElementById('result-image');
  window.errorContainer = document.getElementById('error-container');
  window.errorMessage = document.getElementById('error-message');
  window.downloadBtn = document.getElementById('download-btn');
  // 重新生成按钮已移除
  // window.regenerateBtn = document.getElementById('regenerate-btn');
  window.retryBtn = document.getElementById('retry-btn');
  window.successNotification = document.getElementById('success-notification');
  window.notificationCloseBtn = document.querySelector('.notification-close');

  // 初始化
  init();

  /**
   * 初始化应用
   */
  function init() {
    // 获取风格列表并填充下拉菜单
    fetchStyleList();
    
    // 添加事件监听器
    generateBtn.addEventListener('click', handleGenerate);
    // regenerateBtn.addEventListener('click', handleGenerate); // 重新生成按钮已移除
    retryBtn.addEventListener('click', handleGenerate);
    notificationCloseBtn.addEventListener('click', () => {
      successNotification.classList.remove('show');
    });
    
    // 复制按钮功能已移除，改为仅保留导出按钮
    
    // 添加输入框动画效果
    coverTextInput.addEventListener('focus', () => {
      coverTextInput.parentElement.classList.add('focused');
    });
    
    coverTextInput.addEventListener('blur', () => {
      coverTextInput.parentElement.classList.remove('focused');
    });

    // 添加按钮悬停效果
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.classList.add('hover-effect');
      });
      
      btn.addEventListener('mouseleave', () => {
        btn.classList.remove('hover-effect');
      });
    });

    // 添加键盘快捷键
    coverTextInput.addEventListener('keydown', (e) => {
      // Ctrl+Enter 快捷键生成封面
      if (e.ctrlKey && e.key === 'Enter') {
        handleGenerate();
      }
    });
  }

  /**
   * 获取风格列表并填充下拉菜单
   */
  async function fetchStyleList() {
    console.log('开始获取风格列表...');
    try {
      // 获取当前域名作为API基础URL
      const apiBaseUrl = getApiBaseUrl();
      console.log(`使用API基础URL: ${apiBaseUrl}`);
      
      // 设置10秒超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${apiBaseUrl}/api/styles`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        mode: 'cors', // 明确指定CORS模式
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error(`获取风格列表失败: ${response.status}`);
        return;
      }
      
      const data = await response.json();
      console.log('收到风格列表数据:', data);
      
      if (data.success && Array.isArray(data.styles)) {
        // 先获取风格选择下拉框
        const styleSelect = document.getElementById('style-select');
        if (!styleSelect) {
          console.error('找不到风格选择下拉框');
          return;
        }
        
        // 清空现有选项（除了"随机"选项）
        while (styleSelect.options.length > 1) {
          styleSelect.remove(1);
        }
        
        // 添加风格选项
        data.styles.forEach(style => {
          const option = document.createElement('option');
          option.value = style.name;
          option.textContent = style.name;
          styleSelect.appendChild(option);
          console.log(`添加风格选项: ${style.name}`);
        });
        
        console.log(`已加载 ${data.styles.length} 种风格选项`);
      } else {
        console.error('获取风格列表失败:', data.error || '未知错误');
      }
    } catch (error) {
      console.error('获取风格列表出错:', error);
    }
  }

  /**
   * 处理生成封面请求
   */
  async function handleGenerate(event) {
    // 添加白光闪过效果
    const button = event ? event.currentTarget : document.getElementById('generate-btn');
    button.classList.add('active');
    
    // 动画结束后移除active类
    setTimeout(() => {
      button.classList.remove('active');
    }, 500);
    
    const text = coverTextInput.value.trim();
    const selectedStyle = styleSelect.value;
    
    // 验证输入
    if (!text) {
      showError('请输入封面文字内容');
      return;
    }
    
    // 显示加载状态
    showLoading();
    
    try {
      // 调用API生成封面
      const result = await generateCover(text, selectedStyle);
      
      if (result.success) {
        // 显示生成结果
        showResult(result.coverId, result.style, result.coverCode);
        // 显示成功通知
        showNotification('封面已成功生成', 'success');
      } else {
        // 显示错误信息
        showError(result.error || '生成封面失败，请重试');
      }
    } catch (error) {
      console.error('生成封面出错:', error);
      showError('网络错误或服务器异常，请稍后重试');
    }
  }

  /**
   * 处理复制按钮点击事件
   */
  // handleCopy函数已移除，因为界面上只保留了导出按钮

  /**
   * 获取API基础URL
   * 根据当前环境返回合适的API基础URL
   */
  function getApiBaseUrl() {
    // 检查是否在本地开发环境
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    
    // 在Cloudflare Pages环境中使用相对路径
    if (window.location.hostname.includes('pages.dev')) {
      return '';
    }
    
    // 在Render环境中使用相对路径
    if (window.location.hostname.includes('onrender.com')) {
      return '';
    }
    
    // 其他环境也使用相对路径
    return '';
  }

  /**
   * 调用API生成封面
   * @param {string} text - 用户输入的文字
   * @param {string} style - 选择的风格名称，"random"表示随机选择
   * @returns {Promise<Object>} - 返回生成结果
   */
  async function generateCover(text, style = 'random') {
    console.log(`开始生成卡片, 文字: ${text}, 风格: ${style}`);
    try {
      const apiBaseUrl = getApiBaseUrl();
      console.log(`使用API基础URL: ${apiBaseUrl}`);
      
      // 设置90秒超时，与后端一致
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 增加到90秒
      
      const response = await fetch(`${apiBaseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          title: text, // 将text作为title发送
          content: text, // 将text同时作为content发送
          style 
        }),
        mode: 'cors', // 明确指定CORS模式
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error(`API调用失败: ${response.status} - ${response.statusText}`);
        return {
          success: false,
          error: `服务器响应错误: ${response.status}`
        };
      }
      
      const result = await response.json();
      console.log('收到API响应:', result.success ? '成功' : '失败');
      
      if (!result.success) {
        console.error('生成失败:', result.error);
        // 如果服务器返回了提示信息，一并显示
        if (result.userTip) {
          console.log('用户提示:', result.userTip);
        }
        showError(result.error || '生成失败，请重试', result.userTip);
        return;
      }
      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('API请求超时');
        return {
          success: false,
          error: '请求超时，请检查网络连接并重试'
        };
      }
      
      console.error('API调用出错:', error);
      return {
        success: false,
        error: '网络错误或服务器异常，请稍后重试'
      };
    }
  }

  /**
   * 显示加载状态
   */
  function showLoading() {
    resultSection.classList.add('active');
    loadingContainer.classList.add('active');
    resultContainer.classList.remove('active');
    errorContainer.classList.remove('active');
    
    // 添加加载动画文字
    const loadingTexts = [
      'DeepSeek正在发挥创意...',
      '正在融合艺术风格...',
      '正在构思完美布局...',
      '正在调整色彩平衡...',
      '即将完成你的封面...'
    ];
    
    let index = 0;
    const loadingTextElement = loadingContainer.querySelector('.text-light');
    
    // 清除可能存在的旧定时器
    if (window.loadingTextInterval) {
      clearInterval(window.loadingTextInterval);
    }
    
    // 设置新的定时器，循环显示加载文字
    window.loadingTextInterval = setInterval(() => {
      loadingTextElement.textContent = loadingTexts[index];
      index = (index + 1) % loadingTexts.length;
    }, 2000);
  }

  /**
   * 显示生成结果
   * @param {string} coverId - 封面ID
   * @param {string} style - 风格名称
   * @param {string} coverCode - 封面代码
   */
  function showResult(coverId, style, coverCode) {
    console.log('收到生成结果，正在处理...');
    
    // 清除加载文字定时器
    if (window.loadingTextInterval) {
      clearInterval(window.loadingTextInterval);
    }
    
    // 定义在函数顶部声明变量，所有封闭域中都可见
    let tempContainer = null;
    let timeoutId = null;

    try {
      // 如果没有收到有效的封面代码，显示错误
      if (!coverCode || typeof coverCode !== 'string' || coverCode.trim() === '') {
        console.error('收到空的封面代码');
        showError('生成的卡片代码无效，请重试');
        return;
      }
      
      // 创建一个临时iframe来处理HTML内容
      tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.width = '800px';
      tempContainer.style.height = '600px';
      document.body.appendChild(tempContainer);
      
      const iframe = document.createElement('iframe');
      iframe.id = 'temp-iframe';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      tempContainer.appendChild(iframe);
      
      // 处理HTML代码，移除保存按钮
      const processedCode = coverCode.replace(/<button[^>]*(?:save|download|保存|下载)[^>]*>[\s\S]*?<\/button>/gi, '')
                                .replace(/<a[^>]*(?:save|download|保存|下载)[^>]*>[\s\S]*?<\/a>/gi, '');
      
      console.log('正在将代码注入iframe...');
      
      // 设置iframe内容
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(processedCode);
      iframeDoc.close();
      
      // 设置加载超时，防止无限等待
      timeoutId = setTimeout(() => {
        console.error('iframe加载超时');
        if (tempContainer && document.body.contains(tempContainer)) {
          document.body.removeChild(tempContainer);
        }
        showError('生成卡片超时，请重试');
      }, 15000); // 15秒超时
      
      // 等待iframe加载完成
      setTimeout(() => {
        try {
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          
          console.log('iframe已加载，正在将内容转换为图片...');
          const iframeContent = iframe.contentDocument.body;
          if (!iframeContent) {
            throw new Error('iframe内容为空');
          }
          
          // 使用html2canvas将内容转换为图片
          html2canvas(iframeContent, {
            allowTaint: true,
            useCORS: true,
            scale: 2, // 提高图片质量
            backgroundColor: null // 保留原始背景
          }).then(canvas => {
            console.log('图片生成成功！');
            // 将canvas转换为PNG图片
            const imgData = canvas.toDataURL('image/png');
            
            // 设置图片和按钮
            const resultImg = document.getElementById('result-image');
            resultImg.src = imgData;
            resultImg.setAttribute('data-style', style);
            
            // 设置下载按钮
            const downloadBtn = document.getElementById('download-btn');
            downloadBtn.setAttribute('href', imgData);
            downloadBtn.setAttribute('download', `volcano-card-${Date.now()}.png`);
            
            // 清理临时iframe
            setTimeout(() => {
              if (tempContainer && document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer);
                tempContainer = null;
              }
            }, 300);
            
            // 显示结果容器
            loadingContainer.classList.remove('active');
            resultContainer.classList.add('active');
            
            // 滚动到结果区域
            resultSection.scrollIntoView({ behavior: 'smooth' });
          }).catch(error => {
            console.error('转换图片出错:', error);
            if (tempContainer && document.body.contains(tempContainer)) {
              document.body.removeChild(tempContainer);
              tempContainer = null;
            }
            showError('生成卡片失败，请重试');
          });
        } catch (innerError) {
          console.error('iframe处理错误:', innerError);
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          if (tempContainer && document.body.contains(tempContainer)) {
            document.body.removeChild(tempContainer);
            tempContainer = null;
          }
          showError('生成卡片失败，请重试');
        }
      }, 1000); // 增加待机时间确保内容加载完成
      
    } catch (error) {
      console.error('处理结果时发生异常:', error);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (tempContainer && document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
      showError('生成卡片失败，请重试');
    }
  }

  /**
   * 显示错误信息
   * @param {string} message - 错误信息
   * @param {string} [tip] - 可选的用户提示
   */
  function showError(message, tip) {
    // 清除加载文字定时器
    if (window.loadingTextInterval) {
      clearInterval(window.loadingTextInterval);
    }
    
    // 设置错误信息
    errorMessage.textContent = message;
    
    // 如果有提示，显示在错误信息下方
    if (tip) {
      // 检查是否已存在提示元素，如果没有则创建
      let tipElement = document.getElementById('error-tip');
      if (!tipElement) {
        tipElement = document.createElement('p');
        tipElement.id = 'error-tip';
        tipElement.className = 'text-sm text-gray-600 mt-2';
        errorContainer.appendChild(tipElement);
      }
      
      tipElement.textContent = tip;
      tipElement.style.display = 'block';
    } else {
      // 如果没有提示，隐藏提示元素
      const tipElement = document.getElementById('error-tip');
      if (tipElement) {
        tipElement.style.display = 'none';
      }
    }
    
    // 显示错误容器
    resultSection.classList.add('active');
    loadingContainer.classList.remove('active');
    resultContainer.classList.remove('active');
    errorContainer.classList.add('active');
    
    // 显示错误通知
    showNotification(message, 'error');
  }

  /**
   * 显示通知
   * @param {string} message - 通知信息
   * @param {string} type - 通知类型 (success/error)
   */
  function showNotification(message, type = 'success') {
    const notification = document.getElementById(`${type}-notification`) || successNotification;
    const messageElement = notification.querySelector('.notification-message');
    
    // 设置通知信息
    messageElement.textContent = message;
    
    // 显示通知
    notification.classList.add('show');
    
    // 3秒后自动关闭
    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  }


  
  // 添加页面滚动动画效果
  window.addEventListener('scroll', () => {
    const elements = document.querySelectorAll('.card');
    
    elements.forEach(element => {
      const position = element.getBoundingClientRect();
      
      // 当元素进入视口时添加动画效果
      if (position.top < window.innerHeight && position.bottom >= 0) {
        element.classList.add('in-view');
      }
    });
  });

  // 初始触发一次滚动事件，处理初始可见元素
  setTimeout(() => {
    window.dispatchEvent(new Event('scroll'));
  }, 100);
});
