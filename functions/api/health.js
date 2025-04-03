// 健康检查API
export async function onRequest(context) {
  return new Response(JSON.stringify({ status: 'ok', message: '服务正常运行' }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
