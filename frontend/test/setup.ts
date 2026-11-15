import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

beforeEach(()=>{
  if(typeof window!=='undefined'){
    window.localStorage.clear();
    window.sessionStorage.clear();
  }
});
afterEach(()=>{
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
