import { build, type BuildOptions } from 'esbuild';

const commonOptions: BuildOptions = {
  bundle: true,
  platform: 'node' as const,
  target: 'node20',
  format: 'esm' as const,
  external: ['node:*'],
  packages: 'external' as const,
  sourcemap: true,
  minify: process.env['NODE_ENV'] === 'production',
  logLevel: 'info',
};

async function buildAll() {
  const startTime = Date.now();
  
  try {
    console.log('Building claudekit...');
    
    // Build main CLI
    await build({
      ...commonOptions,
      entryPoints: ['cli/cli.ts'],
      outfile: 'dist/cli.js',
    });
    console.log('✓ Built main CLI (dist/cli.js)');

    // Build hooks CLI
    await build({
      ...commonOptions,
      entryPoints: ['cli/hooks-cli.ts'],
      outfile: 'dist/hooks-cli.js',
    });
    console.log('✓ Built hooks CLI (dist/hooks-cli.js)');

    // Build library export
    await build({
      ...commonOptions,
      entryPoints: ['cli/index.ts'],
      outfile: 'dist/index.js',
    });
    console.log('✓ Built library export (dist/index.js)');
    
    const elapsed = Date.now() - startTime;
    console.log(`\n✅ Build completed in ${elapsed}ms`);

  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run build if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildAll();
}

export { buildAll, commonOptions };