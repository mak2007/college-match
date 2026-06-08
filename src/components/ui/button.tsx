import * as React from "react"
import styles from "./button.module.css"

type ButtonVariant =
  | "default"
  | "cool"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link"

type ButtonSize = "default" | "sm" | "lg" | "icon"

const variantClass: Record<ButtonVariant, string> = {
  default: styles.default,
  cool: styles.cool,
  destructive: styles.destructive,
  outline: styles.outline,
  secondary: styles.secondary,
  ghost: styles.ghost,
  link: styles.link,
}

const sizeClass: Record<ButtonSize, string> = {
  default: styles.sizeDefault,
  sm: styles.sizeSm,
  lg: styles.sizeLg,
  icon: styles.sizeIcon,
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const classes = [
      styles.button,
      variantClass[variant],
      sizeClass[size],
      className,
    ]
      .filter(Boolean)
      .join(" ")

    return <button className={classes} ref={ref} {...props} />
  }
)
Button.displayName = "Button"

export { Button }
