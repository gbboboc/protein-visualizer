import { Dna } from "lucide-react";
import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center space-x-2">
            <Dna className="h-6 w-6 text-primary animate-pulse" />
            <h1 className="font-bold text-xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              HP Protein Visualizer
            </h1>
          </div>
          <nav className="ml-auto">
            <ul className="flex space-x-8">
              <li>
                <Link
                  href="/documentation"
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  About
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}
