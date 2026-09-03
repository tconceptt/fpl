import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:bg-accent/90",
        secondary:
          "border border-border bg-surface-2 text-fg hover:bg-surface-3",
        ghost: "text-fg-2 hover:bg-surface-2 hover:text-fg",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

// Legacy shadcn variant/size names are accepted so existing call sites keep
// compiling: default -> primary, outline/secondary -> secondary, link -> ghost,
// size default/lg -> md.
type LegacyVariant = "default" | "outline" | "link" | "destructive"
type LegacyResolvedVariant = "primary" | "secondary" | "ghost"
type LegacySize = "default" | "lg"

const VARIANT_ALIASES: Record<LegacyVariant, LegacyResolvedVariant> = {
  default: "primary",
  outline: "secondary",
  link: "ghost",
  destructive: "primary",
}

const SIZE_ALIASES: Record<LegacySize, "md"> = {
  default: "md",
  lg: "md",
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<VariantProps<typeof buttonVariants>, "variant" | "size"> {
  asChild?: boolean
  variant?: "primary" | "secondary" | "ghost" | LegacyVariant
  size?: "sm" | "md" | "icon" | LegacySize
}

function resolveVariant(
  variant: ButtonProps["variant"]
): "primary" | "secondary" | "ghost" {
  if (!variant) return "primary"
  if (variant in VARIANT_ALIASES) {
    return VARIANT_ALIASES[variant as LegacyVariant]
  }
  return variant as "primary" | "secondary" | "ghost"
}

function resolveSize(size: ButtonProps["size"]): "sm" | "md" | "icon" {
  if (!size) return "md"
  if (size in SIZE_ALIASES) {
    return SIZE_ALIASES[size as LegacySize]
  }
  return size as "sm" | "md" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(
          buttonVariants({
            variant: resolveVariant(variant),
            size: resolveSize(size),
            className,
          })
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
