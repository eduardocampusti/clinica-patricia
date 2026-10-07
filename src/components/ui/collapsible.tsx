import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"
import { cn } from "cn"

// Recolhível do design system (Base UI já instalado), com os tokens da clínica.
// O painel fica montado quando fechado por padrão, como o <details> que substitui:
// rascunhos e arquivos selecionados dentro dele não se perdem ao recolher.

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({ className, ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn("group/recolhivel flex min-h-10 w-full items-center gap-2 text-left text-sm font-semibold text-[var(--texto-principal)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cor-primaria)]", className)}
      {...props}
    />
  )
}

function CollapsiblePanel({ className, keepMounted = true, ...props }: CollapsiblePrimitive.Panel.Props) {
  return <CollapsiblePrimitive.Panel data-slot="collapsible-panel" keepMounted={keepMounted} className={cn("min-w-0", className)} {...props} />
}

export { Collapsible, CollapsibleTrigger, CollapsiblePanel }
