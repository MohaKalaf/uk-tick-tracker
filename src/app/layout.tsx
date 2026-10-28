import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource-variable/atkinson-hyperlegible-next";
import { NavLink } from "@/components/NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Tick Tracker UK", template: "%s | Tick Tracker UK" },
  description: "See where ticks have been reported across the UK, learn to identify them, and report a sighting.",
  other: { "darkreader-lock": "true" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme script and extensions both add attributes to <html> before hydration
    <html lang="en-GB" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only rounded-md bg-fern px-3 py-2 text-on-fern focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[2000]"
        >
          Skip to content
        </a>
        <header className="border-b border-rule bg-panel">
          <div className="mx-auto flex max-w-[90rem] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
            <Link href="/" className="mr-auto flex items-center gap-2 text-lg font-bold">
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className="text-plum">
                <ellipse cx="12" cy="14" rx="6" ry="7" fill="currentColor" />
                <circle cx="12" cy="6" r="2.6" fill="currentColor" />
                <path d="M6 10 2 7M6 14H1.5M6.5 18 3 21M18 10l4-3M18 14h4.5M17.5 18l3.5 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Tick Tracker UK
            </Link>
            <nav aria-label="Main" className="order-last flex w-full items-center gap-5 sm:order-none sm:w-auto">
              <NavLink href="/">Map</NavLink>
              <NavLink href="/learn">Learn</NavLink>
              <NavLink href="/data">Data</NavLink>
              <Link
                href="/report"
                className="ml-auto rounded-md bg-fern px-3.5 py-2 font-bold text-on-fern hover:opacity-90 sm:ml-2"
              >
                Report a sighting
              </Link>
            </nav>
            <ThemeToggle />
          </div>
        </header>

        <div id="main" className="flex flex-1 flex-col">
          {children}
        </div>

        <footer className="border-t border-rule px-4 py-6 text-sm text-muted sm:px-6">
          <p className="mx-auto max-w-[90rem]">
            Sighting data from Elanco&apos;s placement task API, for educational use only. Built by{" "}
            <a href="https://mohammadkalaf.com" className="underline underline-offset-4 hover:text-ink">
              Mohammad Kalaf
            </a>
            . If you are bitten and feel unwell, contact your GP or call NHS 111.
          </p>
        </footer>
      </body>
    </html>
  );
}
