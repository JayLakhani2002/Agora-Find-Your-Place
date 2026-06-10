import { type VariantProps, cva } from "class-variance-authority"
import type { ButtonHTMLAttributes } from "react"
import { cn } from "./cn"

// 44px+ tap targets are a hard rule (mobile-first PWA)
const buttonVariants = cva(
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default disabled:opacity-60",
  {
    variants: {
      variant: {
        cta: "bg-cta text-white hover:bg-cta/90",
        primary: "bg-primary text-white hover:bg-primary/90",
        outline: "border-2 border-primary bg-transparent text-primary hover:bg-primary/10",
        ghost: "bg-transparent text-primary hover:bg-primary/10",
        danger: "border-2 border-red-600 bg-transparent text-red-600 hover:bg-red-50",
      },
      size: {
        md: "text-base",
        sm: "min-h-11 px-4 text-sm",
        lg: "min-h-12 px-6 text-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type, ...props }: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
