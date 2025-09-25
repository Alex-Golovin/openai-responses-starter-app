"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const linkBaseClasses =
    "rounded-md px-3 py-2 text-sm font-medium transition-colors";

  const renderLink = ({ href, label }: NavLink, variant: "desktop" | "mobile") => {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);
    const activeClasses = "bg-stone-900 text-white";
    const desktopInactive = "text-stone-700 hover:bg-stone-200";
    const mobileInactive = "text-stone-700 hover:bg-stone-100";

    return (
      <Link
        key={`${variant}-${href}`}
        href={href}
        className={`${linkBaseClasses} ${isActive ? activeClasses : variant === "desktop" ? desktopInactive : mobileInactive}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <aside className="hidden h-full w-60 flex-shrink-0 flex-col border-r border-stone-200 bg-white px-4 py-6 md:flex">
        <Link href="/" className="text-lg font-semibold tracking-tight text-stone-900">
          Notarius
        </Link>
        <nav className="mt-6 flex flex-col gap-1">
          {links.map((link) => renderLink(link, "desktop"))}
        </nav>
      </aside>

      <div className="flex w-full items-center justify-between border-b border-stone-200 bg-white px-4 py-3 md:hidden">
        <Link href="/" className="text-base font-semibold tracking-tight text-stone-900">
          Notarius
        </Link>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center justify-center rounded-md border border-stone-300 p-2 text-stone-600 transition hover:bg-stone-200"
          aria-label="Відкрити навігацію"
          aria-expanded={isOpen}
        >
          <Menu size={18} />
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden">
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40"
            aria-label="Закрити навігацію"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-stone-200 bg-white px-4 py-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-lg font-semibold tracking-tight text-stone-900">
                Навігація
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-stone-300 p-2 text-stone-600 transition hover:bg-stone-200"
                aria-label="Закрити навігацію"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {links.map((link) => renderLink(link, "mobile"))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
