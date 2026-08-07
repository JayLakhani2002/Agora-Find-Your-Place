import { cn } from "@/lib/cn"
import Image from "next/image"
import type { CSSProperties, ReactNode } from "react"

/**
 * A device photograph with real product UI rendered INSIDE its screen.
 *
 * WHY STILLS AND NOT FOOTAGE. Jay, 2026-08-07: the content has to be inside the screen, on
 * Apple hardware, white and minimal, "shot like apple". Those requirements rule each other out
 * with video: putting DOM inside a screen only works while the screen stays an axis-aligned
 * rectangle, and any camera move — even a straight push-in — turns that rectangle into a moving
 * target the overlay has to chase per frame. So the shots are locked, dead-on frontal, and
 * static, which is also exactly how Apple's own product pages work: the device holds still and
 * the interface animates on scroll.
 *
 * What that buys, beyond obeying the brief: the screen is real DOM at native resolution rather
 * than a JPEG of a screen, so it is pixel-sharp at any viewport and on any DPR; the whole film
 * is ~260KB of images instead of ~7.5MB of frame sequences; and mobile gets the identical
 * experience rather than a degraded poster, because there is nothing heavy to withhold.
 *
 * `screen` IS MEASURED, NOT EYEBALLED. The rectangles were detected off the rendered images by
 * scanning for the light-grey run walled by bezel on both sides, then verified by drawing them
 * back over the source. If you regenerate a device image you MUST re-measure — a hand-tuned
 * percentage will drift and the UI will sit half off the glass.
 */

export interface DeviceShotProps {
  src: string
  alt: string
  /** Screen rectangle as fractions of the image, measured from the render itself. */
  screen: { left: number; top: number; width: number; height: number }
  /**
   * Design space inside the screen, as a multiple of the screen's rendered width. 2 means the
   * children lay out in twice the screen's CSS pixels and are scaled to half size.
   *
   * This is the trick that keeps the composite responsive with no JS and no container queries:
   * the canvas is sized in PERCENT of the screen box, so it tracks the screen at every viewport,
   * and the scale is a plain constant. Sizing the canvas in px would require knowing the
   * rendered width, which CSS cannot divide by.
   */
  uiScale?: number
  /** Intrinsic pixel size of `src`. The phone crop is not 16:9 like the laptop shots. */
  width: number
  height: number
  children: ReactNode
  className?: string
  priority?: boolean
}

export function DeviceShot({
  src,
  alt,
  screen,
  uiScale = 0.5,
  width,
  height,
  children,
  className,
  priority = false,
}: DeviceShotProps) {
  return (
    <div className={cn("relative", className)}>
      {/*
       * Intrinsic size comes from the caller because the phone shot is a tight crop with a
       * different aspect to the laptops; hardcoding 16:9 here squashed it.
       */}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes="(max-width: 1024px) 100vw, 1024px"
        className="h-auto w-full"
      />
      <div
        className="absolute overflow-hidden"
        style={{
          left: `${screen.left * 100}%`,
          top: `${screen.top * 100}%`,
          width: `${screen.width * 100}%`,
          height: `${screen.height * 100}%`,
        }}
      >
        <div
          style={
            {
              width: `${100 / uiScale}%`,
              height: `${100 / uiScale}%`,
              transform: `scale(${uiScale})`,
              transformOrigin: "top left",
            } as CSSProperties
          }
        >
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * Measured screen rectangles, keyed to the image they belong to. Kept beside the component so a
 * caller cannot pair an image with someone else's rectangle — the two are one fact, not two.
 */
export const DEVICE_SCREENS = {
  workspace: { left: 0.27398, top: 0.21615, width: 0.45203, height: 0.52734 },
  terminal: { left: 0.29651, top: 0.21224, width: 0.40698, height: 0.45703 },
  /**
   * The phone image is CROPPED tight (900x1137, not 16:9) and this rect is remapped into the
   * crop. A phone shown at realistic scale inside a 16:9 frame renders a ~140px screen, at
   * which no interface is legible — so the phone is the hero object and its UI runs near 1:1.
   */
  phone: { left: 0.21458, top: 0.09872, width: 0.48961, height: 0.79034 },
  allLeft: { left: 0.10683, top: 0.42448, width: 0.28706, height: 0.32943 },
  allCentre: { left: 0.47529, top: 0.42448, width: 0.28634, height: 0.32943 },
  allRight: { left: 0.82703, top: 0.52083, width: 0.06323, height: 0.27474 },
} as const
