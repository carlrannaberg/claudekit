import { vi } from 'vitest';

interface ChalkFunction {
  (text: string): string;
  bold: ChalkFunction;
  dim: ChalkFunction;
  underline: ChalkFunction;
  strikethrough: ChalkFunction;
  inverse: ChalkFunction;
}

const createChalkFunction = (): ChalkFunction => {
  const fn = vi.fn((text: string) => text);
  // Add nested color functions
  const mockChalk = Object.assign(fn, {
    bold: vi.fn((text: string) => text),
    dim: vi.fn((text: string) => text),
    underline: vi.fn((text: string) => text),
    strikethrough: vi.fn((text: string) => text),
    inverse: vi.fn((text: string) => text),
  }) as unknown as ChalkFunction;
  
  return mockChalk;
};

const chalk = {
  red: createChalkFunction(),
  green: createChalkFunction(),
  blue: createChalkFunction(),
  yellow: createChalkFunction(),
  cyan: createChalkFunction(),
  magenta: createChalkFunction(),
  white: createChalkFunction(),
  gray: createChalkFunction(),
  bold: createChalkFunction(),
  dim: createChalkFunction(),
  underline: createChalkFunction(),
  strikethrough: createChalkFunction(),
  inverse: createChalkFunction(),
  bgRed: createChalkFunction(),
  bgGreen: createChalkFunction(),
  bgBlue: createChalkFunction(),
  bgYellow: createChalkFunction(),
  bgCyan: createChalkFunction(),
  bgMagenta: createChalkFunction(),
  bgWhite: createChalkFunction(),
  enabled: true,
  level: 3,
};

export default chalk;
