// 中间件函数，处理所有请求
export async function onRequest(context) {
  // 返回静态资源
  try {
    return await context.next();
  } catch (err) {
    return new Response(`${err.message}\n${err.stack}`, { status: 500 });
  }
}
