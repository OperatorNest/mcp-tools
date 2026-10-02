#!/usr/bin/env node
import { serveStdio, StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { createServer } from './server.js';
import { scrub } from './errors.js';

class SafeStdioTransport extends StdioServerTransport {
  override async send(message: Parameters<StdioServerTransport['send']>[0]): Promise<void> {
    await super.send(scrub(message));
  }
}
serveStdio(createServer, {
  transport: new SafeStdioTransport(process.stdin, process.stdout, { maxBufferSize: 32769 }),
  maxSubscriptions: 0,
  onerror: () => { process.stderr.write('MCP request failed. Check the protocol and tool schema.\n'); },
});
