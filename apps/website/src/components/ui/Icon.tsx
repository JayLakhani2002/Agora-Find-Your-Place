/**
 * The site's whole icon set — hand-rolled 24×24 stroke paths, one file, no dependency.
 * Decorative by default (aria-hidden); every icon sits next to a real text label.
 */

const paths = {
  // Platforms (§4.4)
  window: ["M3.5 5.5h17v13h-17z", "M3.5 9.5h17", "M6.5 7.5h.01", "M9 7.5h.01"],
  message: ["M20.5 11.6a8 8 0 0 1-11.9 7L4 20l1.5-4.4A8 8 0 1 1 20.5 11.6Z"],
  bubble: ["M21 12a8.4 8.4 0 0 1-9 8.2c-1 0-2-.2-2.9-.5L4 21l1.4-3.6A8 8 0 1 1 21 12Z"],
  terminal: ["m5 8 3.5 3.5L5 15", "M11.5 16h7"],
  puzzle: [
    "M10 4.5a1.8 1.8 0 0 1 3.6 0V6h3.2v3.2h1.5a1.8 1.8 0 0 1 0 3.6h-1.5V16H13.6v-1.5a1.8 1.8 0 0 0-3.6 0V16H6.8v-3.2H5.3a1.8 1.8 0 0 1 0-3.6h1.5V6H10V4.5Z",
  ],
  // Utility
  arrowRight: ["M4 12h15", "m13 6 6 6-6 6"],
  check: ["m4.5 12.5 5 5 10-11"],
  clock: ["M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z", "M12 7.5V12l3 1.8"],
  spark: ["M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.4 10.1 12.8 4.5 10.9 10.1 9 12 3.5Z"],
} as const

export type IconName = keyof typeof paths

export function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <title>{name}</title>
      {paths[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
