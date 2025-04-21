import type { Metadata } from "next";
import "./globals.css";
import { BrowserAttributes } from "@/components/browser-attributes";

export const metadata: Metadata = {
  title: "HP Protein Visualizer",
  description: "A tool for visualizing and analyzing HP protein folding",
  generator: "Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen bg-background antialiased"
        suppressHydrationWarning
      >
        <BrowserAttributes />
        {children}
      </body>
    </html>
  );
}
