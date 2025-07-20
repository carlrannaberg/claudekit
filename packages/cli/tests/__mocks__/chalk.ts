import { vi } from 'vitest';

const createChalkFunction = () => {
  const fn = vi.fn((text: string) => text) as any;
  // Add nested color functions
  fn.bold = vi.fn((text: string) => text);
  fn.dim = vi.fn((text: string) => text);
  fn.underline = vi.fn((text: string) => text);
  fn.strikethrough = vi.fn((text: string) => text);
  fn.inverse = vi.fn((text: string) => text);
  return fn;
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
  level: 3
};

export default chalk;