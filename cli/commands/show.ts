import type { Command } from 'commander';
import { AgentLoader, CommandLoader } from '../lib/loaders/index.js';

export function registerShowCommands(program: Command): void {
  const showCmd = program
    .command('show')
    .description('Show agent or command prompts');
  
  showCmd
    .command('agent <id>')
    .description('Show an agent prompt')
    .option('-f, --format <format>', 'Output format (text|json)', 'text')
    .action(async (id, options) => {
      try {
        const loader = new AgentLoader();
        const agent = await loader.loadAgent(id);
        
        if (options.format === 'json') {
          console.log(JSON.stringify(agent, null, 2));
        } else {
          console.log(agent.content);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`Try 'claudekit list agents' to see available agents`);
        process.exit(1);
      }
    });
  
  showCmd
    .command('command <id>')
    .description('Show a command prompt')
    .option('-f, --format <format>', 'Output format (text|json)', 'text')
    .action(async (id, options) => {
      try {
        const loader = new CommandLoader();
        const command = await loader.loadCommand(id);
        
        if (options.format === 'json') {
          console.log(JSON.stringify(command, null, 2));
        } else {
          console.log(command.content);
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`Try 'claudekit list commands' to see available commands`);
        process.exit(1);
      }
    });
}