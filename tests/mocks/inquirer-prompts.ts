/**
 * Mock implementation for @inquirer/prompts
 * Provides comprehensive mocking for interactive prompts used in tests
 */

import { vi } from 'vitest';

interface PromptOptions {
  name?: string;
  message?: string;
  default?: unknown;
  choices?: Array<{ value: unknown; name?: string } | unknown>;
  [key: string]: unknown;
}

interface PromptHistoryEntry {
  type: string;
  message: string;
  options?: PromptOptions;
}

// Track mock state for testing
interface MockState {
  responses: Map<string, unknown>;
  promptHistory: PromptHistoryEntry[];
  shouldThrow: boolean;
  throwError: Error | undefined;
}

const mockState: MockState = {
  responses: new Map(),
  promptHistory: [],
  shouldThrow: false,
  throwError: undefined,
};

// Helper functions for test setup
export const mockInquirer = {
  // State management
  reset(): void {
    mockState.responses.clear();
    mockState.promptHistory.length = 0;
    mockState.shouldThrow = false;
    mockState.throwError = undefined;
  },

  // Response setup
  setResponse(key: string, value: unknown): void {
    mockState.responses.set(key, value);
  },

  setResponses(responses: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(responses)) {
      this.setResponse(key, value);
    }
  },

  // Error simulation
  setShouldThrow(shouldThrow: boolean, error?: Error): void {
    mockState.shouldThrow = shouldThrow;
    mockState.throwError = error !== null ? error : undefined;
  },

  // History inspection
  getPromptHistory(): PromptHistoryEntry[] {
    return [...mockState.promptHistory];
  },

  getLastPrompt(): PromptHistoryEntry | undefined {
    return mockState.promptHistory[mockState.promptHistory.length - 1];
  },

  clearHistory(): void {
    mockState.promptHistory.length = 0;
  },
};

// Base prompt function
const createPromptMock = (type: string): ReturnType<typeof vi.fn> => {
  return vi.fn(async (options: PromptOptions) => {
    // Record the prompt
    mockState.promptHistory.push({
      type,
      message: ((): string => {
        if (options.name !== undefined && options.name !== '') {
          return options.name;
        }
        if (options.message !== undefined && options.message !== '') {
          return options.message;
        }
        return 'unknown';
      })(),
      options,
    });

    // Check if we should throw an error
    if (mockState.shouldThrow) {
      throw mockState.throwError !== undefined ? mockState.throwError : new Error(`Mock error for ${type} prompt`);
    }

    // Get response from mock state
    const key = ((): string => {
      if (options.name !== undefined && options.name !== '') {
        return options.name;
      }
      if (options.message !== undefined && options.message !== '') {
        return options.message;
      }
      return type;
    })();
    const response = mockState.responses.get(key);

    if (response !== undefined) {
      return response;
    }

    // Default responses based on prompt type
    switch (type) {
      case 'input':
        return options.default !== undefined ? options.default : 'mock-input';
      case 'password':
        return 'mock-password';
      case 'confirm':
        return options.default !== undefined ? options.default : true;
      case 'select': {
        const firstChoice = options.choices?.[0];
        if (firstChoice !== undefined) {
          const choiceValue = (firstChoice as { value?: unknown })?.value;
          return choiceValue !== undefined ? choiceValue : firstChoice;
        }
        return 'mock-choice';
      }
      case 'checkbox': {
        const choices = options.choices?.slice(0, 1);
        if (choices !== undefined && choices.length > 0) {
          return choices.map((c: unknown) => {
            const value = (c as { value?: unknown }).value;
            return value !== undefined ? value : c;
          });
        }
        return ['mock-choice'];
      }
      case 'number':
        return options.default !== undefined ? options.default : 42;
      case 'editor':
        return options.default !== undefined ? options.default : 'mock-editor-content';
      default:
        return 'mock-response';
    }
  });
};

// Mock implementations for all prompt types
export const input = createPromptMock('input');
export const password = createPromptMock('password');
export const confirm = createPromptMock('confirm');
export const select = createPromptMock('select');
export const checkbox = createPromptMock('checkbox');
export const number = createPromptMock('number');
export const editor = createPromptMock('editor');
export const rawlist = createPromptMock('rawlist');
export const expand = createPromptMock('expand');

// Default export with all prompt types
const mockPrompts = {
  input,
  password,
  confirm,
  select,
  checkbox,
  number,
  editor,
  rawlist,
  expand,
};

export default mockPrompts;

// Export state for test utilities
export { mockState };
