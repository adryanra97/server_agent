import './globals.css';
import './showcase.css';
import './refinements.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TwinPeak — Capacity & release intelligence',
  description: 'Explore infrastructure capacity before production. Deterministic simulations, incident insights, release alignment, and transparent engineering quality.',
  metadataBase: new URL('https://twin.mauikut.com'),
  applicationName: 'TwinPeak',
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'TwinPeak',
    title: 'TwinPeak — See your infrastructure before production',
    description: 'Model CPU, memory, networks, and traffic with transparent simulation evidence and release decisions.',
  },
  twitter: {
    card: 'summary',
    title: 'TwinPeak — Infrastructure capacity intelligence',
    description: 'Explore server capacity, SimPy replay, and evidence-based release decisions.',
  },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
