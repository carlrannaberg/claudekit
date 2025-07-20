/**
 * Mock implementation for @inquirer/prompts
 * Provides comprehensive mocking for interactive prompts used in tests
 */

import { vi } from 'vitest';

// Track mock state for testing
interface MockState {
  responses: Map<string, any>;
  promptHistory: Array<{ type: string; message: string; options?: any }>;
  shouldThrow: boolean;
  throwError?: Error;
}

const mockState: MockState = {
  responses: new Map(),
  promptHistory: [],
  shouldThrow: false,
  throwError: undefined
};

// Helper functions for test setup
export const mockInquirer = {
  // State management
  reset() {
    mockState.responses.clear();
    mockState.promptHistory.length = 0;
    mockState.shouldThrow = false;
    mockState.throwError = undefined;
  },

  // Response setup
  setResponse(key: string, value: any) {
    mockState.responses.set(key, value);
  },

  setResponses(responses: Record<string, any>) {
    for (const [key, value] of Object.entries(responses)) {
      this.setResponse(key, value);
    }
  },

  // Error simulation
  setShouldThrow(shouldThrow: boolean, error?: Error) {
    mockState.shouldThrow = shouldThrow;
    mockState.throwError = error;
  },

  // History inspection
  getPromptHistory() {
    return [...mockState.promptHistory];
  },

  getLastPrompt() {
    return mockState.promptHistory[mockState.promptHistory.length - 1];
  },

  clearHistory() {
    mockState.promptHistory.length = 0;
  }
};

// Base prompt function
const createPromptMock = (type: string) => {
  return vi.fn(async (options: any) => {
    // Record the prompt
    mockState.promptHistory.push({
      type,
      message: options.name || options.message || 'unknown',
      options
    });

    // Check if we should throw an error
    if (mockState.shouldThrow) {
      throw mockState.throwError || new Error(`Mock error for ${type} prompt`);
    }

    // Get response from mock state
    const key = options.name || options.message || type;
    const response = mockState.responses.get(key);
    
    if (response !== undefined) {
      return response;
    }

    // Default responses based on prompt type
    switch (type) {
      case 'input':
        return options.default || 'mock-input';
      case 'password':
        return 'mock-password';
      case 'confirm':
        return options.default !== undefined ? options.default : true;
      case 'select':
        return options.choices?.[0]?.value || options.choices?.[0] || 'mock-choice';
      case 'checkbox':
        return options.choices?.slice(0, 1).map((c: any) => c.value || c) || ['mock-choice'];
      case 'number':
        return options.default || 42;
      case 'editor':
        return options.default || 'mock-editor-content';
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
  expand
};

export default mockPrompts;

// Export state for test utilities
export { mockState };