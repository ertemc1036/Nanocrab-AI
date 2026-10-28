import Link from "next/link"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { createAgentHref } from "@/config/navigation"
import { cn } from "@/lib/utils"

export function CreateAgentButton({
  className,
  onClick,
}: {
  className?: string
  onClick?: () => void
}) {
  return (
    <Button
      asChild
      className={cn("font-semibold shadow-[0_8px_24px_-10px_var(--primary)]", className)}
    >
      <Link href={createAgentHref} onClick={onClick}>
        <PlusIcon />
        Create AI
      </Link>
    </Button>
  )
}
