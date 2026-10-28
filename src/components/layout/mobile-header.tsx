"use client"

import Link from "next/link"
import { MenuIcon } from "lucide-react"
import { useState, type ReactNode } from "react"

import { Logo } from "@/components/brand/logo"
import { SidebarNav } from "@/components/layout/sidebar-nav"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

/** Top bar + slide-out navigation for small screens. */
export function MobileHeader({ footer }: { footer?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md lg:hidden">
      <Link href="/dashboard" className="rounded-md">
        <Logo />
      </Link>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open navigation">
            <MenuIcon />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 gap-0 bg-sidebar p-0">
          <SheetHeader className="h-14 justify-center px-5">
            <SheetTitle>
              <Logo />
            </SheetTitle>
            <SheetDescription className="sr-only">Main navigation</SheetDescription>
          </SheetHeader>
          <div className="flex-1 px-3 pt-2">
            <SidebarNav onNavigate={close} />
          </div>
          {footer ? (
            <div className="border-t border-sidebar-border p-3">{footer}</div>
          ) : null}
        </SheetContent>
      </Sheet>
    </header>
  )
}
