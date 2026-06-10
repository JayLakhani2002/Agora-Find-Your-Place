// Agent 7 — shared component library (shadcn-style primitives on Tailwind).
// Consumed by apps/web via transpilePackages; Tailwind scans this package's
// source (see apps/web/tailwind.config.ts content globs).

export { Badge, type BadgeProps } from "./badge"
export { Button, type ButtonProps } from "./button"
export { Card } from "./card"
export { cn } from "./cn"
export { Progress, type ProgressProps } from "./progress"
export { Spinner } from "./spinner"
export { type TabItem, Tabs, type TabsProps } from "./tabs"
