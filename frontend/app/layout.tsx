import './globals.css';
import './showcase.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TwinPeak — Capacity & release intelligence',
  description: 'Explore infrastructure capacity before production. Deterministic simulations, incident insights, release alignment, and transparent engineering quality.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
