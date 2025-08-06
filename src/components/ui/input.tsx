
import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

// Create a YearInput component specifically for year inputs with increment/decrement
const YearInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "type" | "min" | "max"> & {
    defaultYear?: number;
  }
>(({ className, defaultYear = 2015, ...props }, ref) => {
  return (
    <Input
      type="number"
      min={1900}
      max={2100}
      defaultValue={defaultYear}
      className={cn("appearance-auto", className)}
      ref={ref}
      {...props}
    />
  )
})
YearInput.displayName = "YearInput"

export { Input, YearInput }
