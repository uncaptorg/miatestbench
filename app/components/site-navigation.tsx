"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "MIA Diagram", href: "/mia-api" },
  { label: "Audio Use Case", href: "/audio-use-case" },
  { label: "Audio Test Bench", href: "/mia-audio-test-bench" },
  { label: "Care Plan", href: "/mia-audio-test-bench/care-plan" },
];

export default function SiteNavigation() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
      <nav className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 md:px-8">
        <Link href="/" className="text-sm font-semibold tracking-tight text-slate-900">
          MIA Dev Hub
        </Link>
        <ul className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors md:text-sm ${
                    isActive
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}