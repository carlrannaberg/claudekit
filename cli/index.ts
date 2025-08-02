// Main library exports
export { validate } from './commands/validate.js';
export { setup } from './commands/setup.js';
export { add } from './commands/add.js';
export { remove } from './commands/remove.js';
export { update } from './commands/update.js';
export { list } from './commands/list.js';

// Export types
export type { Config, HooksConfig, HookMatcher } from './types/config.js';

// Export utilities
export { loadConfig, saveConfig } from './utils/config.js';
export { Logger } from './utils/logger.js';
export { Colors, colors, symbols, status } from './utils/colors.js';

// Export core library functions
export * from './lib/index.js';

// Export the CLI program for programmatic use (note: importing this will not execute the CLI)
export { default as program } from './cli.js';
