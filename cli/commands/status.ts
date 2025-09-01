import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { Logger } from '../utils/logger.js';

const logger = new Logger();

export interface StatusOptions {
  verbose?: boolean;
  quiet?: boolean;
}

export async function status(subcommand: string, _options: StatusOptions = {}): Promise<void> {
  switch (subcommand) {
    case 'stm':
      await checkStmStatus();
      break;
    default:
      logger.error(`Unknown status subcommand: ${subcommand}`);
      console.log('Available subcommands: stm');
      process.exit(1);
  }
}

async function checkStmStatus(): Promise<void> {
  try {
    // Check if stm command exists
    try {
      execSync('which stm', { stdio: 'ignore' });
    } catch {
      console.log('STM_STATUS: Not installed');
      return;
    }

    // Check if .simple-task-master directory exists
    if (existsSync('.simple-task-master')) {
      console.log('STM_STATUS: Available and initialized');
    } else {
      console.log('STM_STATUS: Available but not initialized');
    }
  } catch (error) {
    logger.error(`Error checking STM status: ${error instanceof Error ? error.message : String(error)}`);
    console.log('STM_STATUS: Error checking status');
  }
}