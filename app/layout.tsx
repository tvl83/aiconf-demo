import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Conf 2025 — September 6, San Francisco",
  description:
    "The future of AI, live in San Francisco. Register for AI Conf 2025.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
