// 导入风格列表
import { stylePrompts } from '../../src/styles.js';

// 获取风格列表API
export async function onRequest(context) {
  try {
    // 提取风格名称列表
    const styles = stylePrompts.map(style => ({
      name: style.name
    }));
    
    // 返回成功响应，包含 success 字段和 styles 数组
    return new Response(JSON.stringify({
      success: true,
      styles: styles
    }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
