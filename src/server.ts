import { fromJsonSchema, McpServer } from '@modelcontextprotocol/server';
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/server/validators/cf-worker';
import { MCP_TOOLS, callMcpTool } from './mcp-tools.js';

const validator=new CfWorkerJsonSchemaValidator();
export function createServer() {
  const server=new McpServer({name:'OperatorNest tools',version:'1.0.0'},{jsonSchemaValidator:validator});
  for (const tool of MCP_TOOLS) server.registerTool(tool.name,{
    title:tool.title,description:tool.description,annotations:tool.annotations,
    inputSchema:fromJsonSchema(tool.inputSchema,validator),outputSchema:fromJsonSchema(tool.outputSchema,validator),
  },async input => { try { return callMcpTool(tool,input); } catch { return {isError:true,content:[{type:'text' as const,text:'Invalid input. Check the tool schema and retry.'}]}; } });
  return server;
}
