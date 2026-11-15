import { describe, expect, it } from 'vitest';
import nextConfig from './next.config';

describe('Next.js response hardening',()=>{
  it('enables React strict mode',()=>expect(nextConfig.reactStrictMode).toBe(true));
  it('applies security headers across application routes',async()=>{
    const groups=await nextConfig.headers?.();
    expect(groups).toBeDefined();
    const root=groups?.find(group=>group.source==='/:path*');
    expect(root).toBeDefined();
    const headers=Object.fromEntries((root?.headers??[]).map(h=>[h.key,h.value]));
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Permissions-Policy']).toContain('camera=()');
  });
});
