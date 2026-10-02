import { createMcpHandler } from '@modelcontextprotocol/server';
import { createServer } from './server.js';
import { contentIdentity } from './tool-contracts.js';
import { scrub } from './errors.js';

export type McpEnv = { MCP_LIMITER?: {limit(options:{key:string}):Promise<{success:boolean}>} };
export const MCP_BODY_LIMIT=32768;
const handler=createMcpHandler(createServer,{legacy:'stateless',responseMode:'json',maxRequestBodySize:MCP_BODY_LIMIT,maxSubscriptions:0});
const cors = {
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':'Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id, MCP-Client-Info, MCP-Client-Capabilities, MCP-Server-Info, Mcp-Method, Mcp-Name',
  'Access-Control-Expose-Headers':'MCP-Protocol-Version, MCP-Session-Id, Retry-After',
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
};
const error=(status:number,message:string) => Response.json({jsonrpc:'2.0',id:null,error:{code:-32600,message}},{status,headers:cors});
function validOrigin(request:Request) {
  const origin=request.headers.get('Origin'); if (origin===null) return true;
  try {
    const url=new URL(origin), endpoint=new URL(request.url);
    if (url.origin!==origin || !['http:','https:'].includes(url.protocol)) return false;
    if (['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname)) return url.origin===endpoint.origin || ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
    // Public, read-only tools with CORS open to all: any HTTPS origin may call them.
    return url.protocol==='https:';
  } catch { return false; }
}
export async function handleMcp(request:Request,env:McpEnv):Promise<Response> {
  if (!validOrigin(request)) return error(403,'Origin is not allowed.');
  if (request.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
  if (request.method==='GET' && /text\/html/.test(request.headers.get('Accept') ?? '')) return new Response('OperatorNest tools is a public MCP server for five calculations. Connect with Streamable HTTP at https://operatornest.com/mcp. Docs: https://operatornest.com/tools/mcp\n',{headers:{...cors,'Content-Type':'text/plain; charset=utf-8'}});
  if (request.method!=='POST') return new Response('Use POST for MCP requests. Docs: https://operatornest.com/tools/mcp\n',{status:405,headers:{...cors,Allow:'GET, POST, OPTIONS'}});
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') ?? '')) return error(415,'Send application/json.');
  try {
    const ip=request.headers.get('CF-Connecting-IP');
    if (env.MCP_LIMITER) {
      if (!ip) return error(503,'Calculation unavailable. Try again later.');
      const limited=await env.MCP_LIMITER.limit({key:`mcp:${contentIdentity(ip)}`});
      if (!limited.success) { const response=error(429,'Too many requests. Try again in a minute.'); response.headers.set('Retry-After','60'); return response; }
    }
    const reader=request.body?.getReader(); if (!reader) return error(400,'Send a JSON body.');
    const chunks:Uint8Array[]=[]; let size=0;
    while (true) { const {done,value}=await reader.read(); if (done) break; size+=value.byteLength; if(size>MCP_BODY_LIMIT){await reader.cancel();return error(413,'Request body is too large.');} chunks.push(value); }
    let body:unknown;
    try { body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(chunks.flatMap(c => Array.from(c))))); } catch { return error(400,'Send valid UTF-8 JSON.'); }
    // Both current and compatibility revisions use individual requests, not JSON-RPC batches.
    if (Array.isArray(body)) return error(400,'Send one MCP request at a time.');
    const response=await handler.fetch(request,{parsedBody:body});
    const headers=new Headers(response.headers); Object.entries(cors).forEach(([key,value]) => headers.set(key,value));
    if (response.status===202 || response.status===204) return new Response(null,{status:response.status,headers});
    const raw=await response.text();
    let messages:any[];
    try { messages=[JSON.parse(raw)]; } catch { messages=raw.split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6))); }
    if (!messages.length) return error(response.status>=400 ? response.status : 500,'MCP request failed.');
    headers.set('Content-Type','application/json');
    return new Response(JSON.stringify(scrub(messages.at(-1))),{status:response.status,headers});
  } catch { return error(503,'Calculation unavailable. Try again later.'); }
}
