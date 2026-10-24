"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, GraduationCap, Home, PlusCircle, User } from "lucide-react";

const NAV = [
  { href: "/", label: "Início", icon: Home },
  { href: "/registrar", label: "Registrar", icon: PlusCircle },
  { href: "/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/materias", label: "Matérias", icon: GraduationCap },
  { href: "/conta", label: "Conta", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0d0d0f]/95 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-safe pt-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors ${
                  active
                    ? "text-primary"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
