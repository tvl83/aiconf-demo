import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Conf 2025',
  description: 'The future of AI, live in San Francisco — September 6, 2025.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-200 antialiased">{children}</body>
    </html>
  );
}
