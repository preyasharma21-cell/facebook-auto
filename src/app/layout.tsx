import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AutoPilot | Private Multi-Page Facebook Automation',
  description: 'Enterprise-grade private content automation, video transcoding, and multi-page Facebook queue scheduling platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
