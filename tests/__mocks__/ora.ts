import { vi } from 'vitest';

const mockSpinner = {
  start: vi.fn().mockReturnThis(),
  stop: vi.fn().mockReturnThis(),
  succeed: vi.fn().mockReturnThis(),
  fail: vi.fn().mockReturnThis(),
  warn: vi.fn().mockReturnThis(),
  info: vi.fn().mockReturnThis(),
  text: '',
  color: 'cyan',
  spinner: 'dots',
};

const ora = vi.fn(() => mockSpinner);

export default ora;
