import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"

/**
 * Renders AI Markdown safely: raw HTML is never rendered (no rehype-raw),
 * links open in a new tab without referrer or opener access.
 */
const components: Components = {
  p: ({ children }) => (
    <p className="leading-relaxed [&:not(:first-child)]:mt-3">{children}</p>
  ),
  ul: ({ children }) => <ul className="mt-3 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mt-3 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => <h3 className="mt-4 text-base font-semibold">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-4 text-base font-semibold">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-4 text-sm font-semibold">{children}</h4>,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="text-primary underline underline-offset-4"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mt-3 overflow-x-auto rounded-lg border bg-muted/60 p-3 text-xs">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mt-3 border-l-2 pl-3 text-muted-foreground">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b px-2 py-1.5 font-semibold">{children}</th>
  ),
  td: ({ children }) => <td className="border-b px-2 py-1.5 align-top">{children}</td>,
}

export function Markdown({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  return (
    <div className={cn("text-sm break-words", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  )
}
