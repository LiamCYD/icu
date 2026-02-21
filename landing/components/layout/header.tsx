"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_LINKS, GITHUB_REPO } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="w-full border-b border-border/40">
      <div className="mx-auto flex h-[89px] max-w-[1920px] items-center justify-between px-6 md:px-20">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/images/ICU logo.svg" alt="ICU" className="h-8 w-10" />
          <span className="text-[28px] text-white" style={{ fontFamily: "var(--font-body)" }}>
            ICU
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-12 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-xl transition-colors",
                pathname === link.href
                  ? "text-white"
                  : "text-white/70 hover:text-white"
              )}
              style={{ fontFamily: "var(--font-body)" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* GitHub link (desktop) */}
        <a
          href={GITHUB_REPO}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden text-xl text-white/70 transition-colors hover:text-white md:block"
          style={{ fontFamily: "var(--font-body)" }}
        >
          GitHub
        </a>

        {/* Mobile menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white md:hidden"
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-72 border-border bg-background"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <nav className="mt-8 flex flex-col gap-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-md px-4 py-3 text-lg transition-colors",
                    pathname === link.href
                      ? "bg-secondary text-white"
                      : "text-white/70 hover:text-white"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <a
                href={GITHUB_REPO}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 rounded-md px-4 py-3 text-lg text-white/70 transition-colors hover:text-white"
              >
                GitHub
              </a>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
