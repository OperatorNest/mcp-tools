import { handleMcp, type McpEnv } from './http.js';
export default {
  fetch(request: Request, env: McpEnv): Promise<Response> {
    if (new URL(request.url).pathname !== '/mcp') return Promise.resolve(new Response('Not found', { status: 404 }));
    return handleMcp(request, env);
  },
};
