import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { cn } from "cn"

// Subconjunto do dropdown-menu shadcn (base-nova), com as cores trocadas pelos tokens da clínica.

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
  container,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<
    MenuPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  > & {
    /** Opcional: onde montar o menu (ex.: dentro de um <dialog> modal). Sem ele, o padrão do Base UI (body). */
    container?: MenuPrimitive.Portal.Props["container"]
  }) {
  return (
    <MenuPrimitive.Portal container={container}>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn("z-50 max-h-(--available-height) min-w-40 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-[var(--fundo-card)] p-1 text-[var(--texto-principal)] shadow-md ring-1 ring-[var(--texto-principal)]/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className)}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function DropdownMenuItem({
  className,
  ...props
}: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "relative flex min-h-9 cursor-default items-center gap-2 rounded-md px-2 text-sm outline-hidden select-none focus:bg-[var(--cor-primaria-suave)] focus:text-[var(--texto-principal)] data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-[var(--borda)]", className)}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
}
