"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const active = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "text-ink underline decoration-fern decoration-[3px] underline-offset-[10px]"
          : "text-muted hover:text-ink"
      }
    >
      {children}
    </Link>
  );
}
