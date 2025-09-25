"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = {
  href: string;
  label: string;
};

const links: NavLink[] = [
  { href: "/", label: "Чат" },
  { href: "/admin", label: "Адмін" },
];

export default function NavigationMenu() {
  const pathname = usePathname();
  const linkBaseClasses =
    "rounded-md px-3 py-2 text-sm font-medium transition-colors";

  return (
    <aside className="flex h-full min-h-screen w-60 flex-shrink-0 flex-col border-r border-stone-200 bg-white px-4 py-6 sticky top-0">
      <Link href="/" className="text-lg font-semibold tracking-tight text-stone-900">
        Notarius
      </Link>
      <nav className="mt-6 flex flex-col gap-1">
        {links.map(({ href, label }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          const classes = isActive
            ? `${linkBaseClasses} bg-stone-900 text-white`
            : `${linkBaseClasses} text-stone-700 hover:bg-stone-200`;
          return (
            <Link key={href} href={href} className={classes}>
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
