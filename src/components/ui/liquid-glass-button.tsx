"use client"

import * as React from "react"
import styles from "./liquid-glass-button.module.css"

type LiquidButtonSize = "sm" | "default" | "lg" | "xl" | "xxl" | "icon"

const sizeClass: Record<LiquidButtonSize, string> = {
  sm: styles.sizeSm,
  default: styles.sizeDefault,
  lg: styles.sizeLg,
  xl: styles.sizeXl,
  xxl: styles.sizeXxl,
  icon: styles.sizeIcon,
}

export interface LiquidButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: LiquidButtonSize
}

function LiquidButton({
  className,
  size = "xxl",
  children,
  ...props
}: LiquidButtonProps) {
  const classes = [styles.button, sizeClass[size], className]
    .filter(Boolean)
    .join(" ")

  return (
    <button data-slot="button" className={classes} {...props}>
      <div className={styles.glassShadow} />
      <div className={styles.glassDistort} />
      <span className={styles.content}>{children}</span>
      <GlassFilter />
    </button>
  )
}

function GlassFilter() {
  return (
    <svg className={styles.glassFilter} aria-hidden="true">
      <defs>
        <filter
          id="container-glass"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.05 0.05"
            numOctaves="1"
            seed="1"
            result="turbulence"
          />
          <feGaussianBlur
            in="turbulence"
            stdDeviation="2"
            result="blurredNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            scale="70"
            xChannelSelector="R"
            yChannelSelector="B"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation="4" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  )
}

export { LiquidButton }
