import type { Ora } from 'ora';
import ora from 'ora';
import { Colors, status } from './colors.js';
// import { symbols } from './colors.js'; // Unused

/**
 * Progress reporting utility for ClaudeKit CLI
 *
 * Provides consistent progress indicators, spinners, and status updates
 * with support for quiet mode and different operation types.
 */

export interface ProgressOptions {
  quiet?: boolean | undefined;
  verbose?: boolean | undefined;
  suppressSpinners?: boolean | undefined;
}

export interface ProgressStep {
  id: string;
  name: string;
  description: string;
  total?: number;
  completed?: number;
}

export interface ProgressState {
  phase:
    | 'planning'
    | 'discovering'
    | 'validating'
    | 'installing'
    | 'configuring'
    | 'complete'
    | 'failed';
  currentStep?: ProgressStep;
  totalSteps: number;
  completedSteps: number;
  message: string;
  warnings: string[];
  errors: string[];
}

/**
 * Progress reporter with spinner management and quiet mode support
 */
export class ProgressReporter {
  private spinner: Ora | null = null;
  private options: ProgressOptions;
  private state: ProgressState;
  private startTime: number;

  constructor(options: ProgressOptions = {}) {
    this.options = options;
    this.startTime = Date.now();
    this.state = {
      phase: 'planning',
      totalSteps: 0,
      completedSteps: 0,
      message: '',
      warnings: [],
      errors: [],
    };
  }

  /**
   * Start a new spinner with a message
   */
  start(message: string): void {
    if (this.options.quiet === true || this.options.suppressSpinners === true) {
      return;
    }

    this.stop(); // Stop any existing spinner
    this.spinner = ora(message).start();
  }

  /**
   * Update the current spinner message
   */
  update(message: string): void {
    if (this.options.quiet === true || this.options.suppressSpinners === true) {
      return;
    }

    if (this.spinner) {
      this.spinner.text = message;
    } else {
      this.start(message);
    }
  }

  /**
   * Update progress with detailed state
   */
  updateProgress(state: Partial<ProgressState>): void {
    this.state = { ...this.state, ...state };

    if (this.options.quiet === true) {
      return;
    }

    const message = this.formatProgressMessage();
    this.update(message);

    if (this.options.verbose === true && state.currentStep !== undefined) {
      console.log(Colors.debug(`  ${state.currentStep.description}`));
    }
  }

  /**
   * Report progress for a specific step
   */
  step(step: ProgressStep, progress?: { current: number; total: number }): void {
    this.state.currentStep = step;

    if (progress) {
      this.state.completedSteps = progress.current;
      this.state.totalSteps = progress.total;
    }

    const message = progress
      ? `[${progress.current}/${progress.total}] ${step.description}`
      : step.description;

    this.update(message);
  }

  /**
   * Complete current operation successfully
   */
  succeed(message?: string): void {
    if (this.options.quiet === true) {
      return;
    }

    const finalMessage = message !== undefined && message !== '' ? message : this.formatCompletionMessage();

    if (this.spinner) {
      this.spinner.succeed(Colors.success(finalMessage));
      this.spinner = null;
    } else {
      console.log(status.success(finalMessage));
    }
  }

  /**
   * Fail current operation with error message
   */
  fail(message?: string): void {
    if (this.options.quiet === true) {
      return;
    }

    const errorMessage = message !== undefined && message !== '' ? message : 'Operation failed';

    if (this.spinner) {
      this.spinner.fail(Colors.error(errorMessage));
      this.spinner = null;
    } else {
      console.log(status.error(errorMessage));
    }
  }

  /**
   * Add a warning message
   */
  warn(message: string): void {
    this.state.warnings.push(message);

    if (this.options.quiet !== true) {
      console.log(status.warning(message));
    }
  }

  /**
   * Add an error message
   */
  error(message: string): void {
    this.state.errors.push(message);

    if (this.options.quiet !== true) {
      console.log(status.error(message));
    }
  }

  /**
   * Log informational message
   */
  info(message: string): void {
    if (this.options.quiet !== true) {
      console.log(status.info(message));
    }
  }

  /**
   * Stop current spinner without showing result
   */
  stop(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  /**
   * Clear spinner and any console artifacts
   */
  clear(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  /**
   * Get current progress state
   */
  getState(): ProgressState {
    return { ...this.state };
  }

  /**
   * Get elapsed time in milliseconds
   */
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Format progress message for display
   */
  private formatProgressMessage(): string {
    const { phase, completedSteps, totalSteps, message, currentStep } = this.state;

    if (totalSteps > 0) {
      const percentage = Math.round((completedSteps / totalSteps) * 100);
      const progress = `[${completedSteps}/${totalSteps}] ${percentage}%`;

      if (currentStep !== undefined) {
        return `${progress} ${currentStep.description}`;
      } else if (message !== undefined && message !== '') {
        return `${progress} ${message}`;
      } else {
        return `${progress} ${phase}...`;
      }
    }

    return message !== undefined && message !== '' ? message : `${phase}...`;
  }

  /**
   * Format completion message with summary
   */
  private formatCompletionMessage(): string {
    const elapsed = this.getElapsedTime();
    const duration = elapsed < 1000 ? `${elapsed}ms` : `${(elapsed / 1000).toFixed(1)}s`;

    if (this.state.totalSteps > 0) {
      return `Completed ${this.state.totalSteps} steps in ${duration}`;
    }

    return `Operation completed in ${duration}`;
  }
}

/**
 * Create a progress reporter with options
 */
export function createProgressReporter(options: ProgressOptions = {}): ProgressReporter {
  return new ProgressReporter(options);
}

/**
 * Progress indicator for file operations
 */
export class FileProgressReporter {
  private reporter: ProgressReporter;
  private files: Map<string, { size?: number; copied?: number }>;

  constructor(options: ProgressOptions = {}) {
    this.reporter = new ProgressReporter(options);
    this.files = new Map();
  }

  /**
   * Initialize file list for progress tracking
   */
  initialize(files: string[]): void {
    this.files.clear();
    files.forEach((file) => this.files.set(file, {}));

    this.reporter.updateProgress({
      phase: 'installing',
      totalSteps: files.length,
      completedSteps: 0,
      message: 'Preparing file operations...',
    });
  }

  /**
   * Report progress for a file operation
   */
  fileProgress(
    filePath: string,
    status: 'started' | 'completed' | 'failed',
    details?: string
  ): void {
    const splitResult = filePath.split('/').pop();
    const fileName = splitResult !== undefined && splitResult !== '' ? splitResult : filePath;

    switch (status) {
      case 'started':
        this.reporter.update(`Copying ${fileName}...`);
        break;

      case 'completed': {
        const completed =
          Array.from(this.files.values()).filter((f) => f.copied !== undefined).length + 1;
        this.files.set(filePath, { ...this.files.get(filePath), copied: 100 });

        this.reporter.updateProgress({
          completedSteps: completed,
          message: `Installed ${fileName}`,
        });
        break;
      }

      case 'failed':
        this.reporter.error(`Failed to copy ${fileName}: ${details !== undefined && details !== '' ? details : 'Unknown error'}`);
        break;
    }
  }

  /**
   * Complete file operations
   */
  complete(): void {
    const totalFiles = this.files.size;
    this.reporter.succeed(`Installed ${totalFiles} file${totalFiles !== 1 ? 's' : ''}`);
  }

  /**
   * Fail file operations
   */
  fail(message: string): void {
    this.reporter.fail(message);
  }
}

/**
 * Progress indicator for component operations
 */
export class ComponentProgressReporter {
  private reporter: ProgressReporter;
  private components: string[];
  private currentIndex: number;

  constructor(options: ProgressOptions = {}) {
    this.reporter = new ProgressReporter(options);
    this.components = [];
    this.currentIndex = 0;
  }

  /**
   * Initialize component list
   */
  initialize(componentNames: string[]): void {
    this.components = componentNames;
    this.currentIndex = 0;

    this.reporter.updateProgress({
      phase: 'discovering',
      totalSteps: componentNames.length,
      completedSteps: 0,
      message: 'Discovering components...',
    });
  }

  /**
   * Report progress for component discovery/installation
   */
  componentProgress(
    componentName: string,
    status: 'discovering' | 'installing' | 'completed' | 'failed'
  ): void {
    const index = this.components.indexOf(componentName);
    if (index >= 0) {
      this.currentIndex = index;
    }

    switch (status) {
      case 'discovering':
        this.reporter.updateProgress({
          phase: 'discovering',
          completedSteps: this.currentIndex,
          message: `Discovering ${componentName}...`,
        });
        break;

      case 'installing':
        this.reporter.updateProgress({
          phase: 'installing',
          completedSteps: this.currentIndex,
          message: `Installing ${componentName}...`,
        });
        break;

      case 'completed':
        this.reporter.updateProgress({
          completedSteps: this.currentIndex + 1,
          message: `Installed ${componentName}`,
        });
        break;

      case 'failed':
        this.reporter.error(`Failed to install ${componentName}`);
        break;
    }
  }

  /**
   * Complete component operations
   */
  complete(): void {
    this.reporter.succeed(`Installed ${this.components.length} components`);
  }

  /**
   * Fail component operations
   */
  fail(message: string): void {
    this.reporter.fail(message);
  }

  /**
   * Stop the progress spinner (for interactive prompts)
   */
  stop(): void {
    this.reporter.stop();
  }
}

/**
 * Simple progress utilities for quick operations
 */
export const progress = {
  /**
   * Show a spinner for the duration of an async operation
   */
  async withSpinner<T>(
    message: string,
    operation: () => Promise<T>,
    options: ProgressOptions = {}
  ): Promise<T> {
    const reporter = new ProgressReporter(options);

    try {
      reporter.start(message);
      const result = await operation();
      reporter.succeed();
      return result;
    } catch (error) {
      reporter.fail(`${message} failed`);
      throw error;
    }
  },

  /**
   * Show step-by-step progress for multiple operations
   */
  async withSteps<T>(
    steps: Array<{ name: string; operation: () => Promise<T> }>,
    options: ProgressOptions = {}
  ): Promise<T[]> {
    const reporter = new ProgressReporter(options);
    const results: T[] = [];

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (!step) {
          continue;
        }

        reporter.step(
          {
            id: `step-${i}`,
            name: step.name,
            description: step.name,
          },
          { current: i, total: steps.length }
        );

        const result = await step.operation();
        results.push(result);
      }

      reporter.succeed();
      return results;
    } catch (error) {
      reporter.fail();
      throw error;
    }
  },
};

// Types are already exported as interfaces above
