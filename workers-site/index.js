/**
 * AI封面生成器 - Cloudflare Workers入口文件
 * 处理静态资源和API请求
 */

import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

/**
 * 处理请求的事件处理程序
 */
async function handleRequest(event) {
  const url = new URL(event.request.url);
  
  try {
    // 尝试从KV存储获取静态资源
    return await getAssetFromKV(event);
  } catch (e) {
    // 如果资源不存在，返回404
    return new Response(`找不到资源: ${url.pathname}`, {
      status: 404,
      statusText: 'Not Found',
    });
  }
}

// 注册事件监听器
addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event));
});
