import { build } from 'esbuild';
import { chmodSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
rmSync('dist', { recursive: true, force: true });
for (const [entry, platform, output] of [['stdio', 'node', 'stdio'], ['worker', 'browser', 'worker'], ['mcp-tools', 'neutral', 'tools'], ['http', 'neutral', 'http']]) {
  await build({ entryPoints: [`src/${entry}.ts`], outfile: `dist/${output}.js`, bundle: true, packages: 'external', format: 'esm', platform, target: 'es2022' });
}
execFileSync('pnpm', ['exec', 'tsc'], { stdio: 'inherit' });
chmodSync('dist/stdio.js', 0o755);
