"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "規劃" },
  { href: "/trips", label: "我的行程" },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <header className="mb-5 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <span className="text-2xl">✈️</span>
        <span className="text-xl font-extrabold tracking-tight text-slate-900">
          SmartTrip <span className="text-brand-accent">FX</span>
        </span>
      </Link>
      <nav className="flex items-center gap-1 rounded-full bg-slate-200/70 p-1">
        {links.map((l) => {
          const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
