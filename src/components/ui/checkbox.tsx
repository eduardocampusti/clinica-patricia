"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { cn } from "cn"
import { CheckIcon } from "lucide-react"

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-[var(--borda)] transition-colors outline-none group-has-disabled/field:opacity-50 group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-checked:border-[var(--borda)] after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-[var(--cor-primaria)] focus-visible:ring-3 focus-visible:ring-[var(--cor-primaria)]/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[var(--feedback-erro-texto)] aria-invalid:ring-3 aria-invalid:ring-[var(--feedback-erro-texto)]/20 aria-invalid:aria-checked:border-[var(--cor-primaria)] dark:bg-[var(--borda)]/30 dark:aria-invalid:border-[var(--feedback-erro-texto)]/50 dark:aria-invalid:ring-[var(--feedback-erro-texto)]/40 data-checked:border-[var(--cor-primaria)] data-checked:bg-[var(--cor-primaria)] data-checked:text-[var(--texto-sobre-primaria)] group-has-[:focus-visible]/field-label:data-checked:border-[var(--cor-primaria)] dark:data-checked:bg-[var(--cor-primaria)]",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
