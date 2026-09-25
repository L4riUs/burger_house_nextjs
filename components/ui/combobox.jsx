"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { ChevronDownIcon, SearchIcon, CheckIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const Combobox = ComboboxPrimitive.Root

function ComboboxValue({
  className,
  placeholder,
  ...props
}) {
  return (
    <ComboboxPrimitive.Value
      data-slot="combobox-value"
      className={cn("flex flex-1 text-left truncate", className)}
      placeholder={placeholder}
      {...props}
    />
  )
}

function ComboboxInput({
  className,
  placeholder,
  disabled,
  ...props
}) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-input"
      className={cn(
        "flex w-full items-center gap-2 rounded-3xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 data-[open=true]:border-ring data-[open=true]:ring-3 data-[open=true]:ring-ring/30 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      placeholder={placeholder}
      disabled={disabled}
      {...props}
    />
  )
}

function ComboboxTrigger({
  className,
  children,
  ...props
}) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      className={cn(
        "flex w-fit items-center justify-between gap-1.5 rounded-3xl border border-transparent bg-input/50 px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow,background-color] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}>
      {children}
      <ComboboxPrimitive.Icon
        render={
          <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
        } />
    </ComboboxPrimitive.Trigger>
  )
}

function ComboboxContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = true,
  ...props
}) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-50">
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn(
            "relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-3xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/5 duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}>
          <div className="flex flex-col p-1.5">
            <ComboboxFilter className="mb-1.5" />
            <ComboboxPrimitive.List>{children}</ComboboxPrimitive.List>
          </div>
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

function ComboboxFilter({ className }) {
  const filterRef = React.useRef(null)

  return (
    <ComboboxPrimitive.Filter
      ref={filterRef}
      data-slot="combobox-filter"
      className={cn(
        "relative flex items-center gap-2 rounded-2xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground outline-none focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30",
        className
      )}>
      <SearchIcon className="pointer-events-none size-4 text-muted-foreground shrink-0" />
      <ComboboxPrimitive.FilterInput
        className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        placeholder="Buscar..."
      />
      <ComboboxPrimitive.ClearButton
        className="flex items-center justify-center size-7 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-label="Limpiar búsqueda">
        <XIcon className="size-4" />
      </ComboboxPrimitive.ClearButton>
    </ComboboxPrimitive.Filter>
  )
}

function ComboboxItem({
  className,
  children,
  ...props
}) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-2.5 rounded-2xl py-2 pr-8 pl-3 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}>
      <ComboboxPrimitive.ItemText className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">
        {children}
      </ComboboxPrimitive.ItemText>
      <ComboboxPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }>
        <CheckIcon className="pointer-events-none" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  )
}

function ComboboxGroup({
  className,
  children,
  ...props
}) {
  return (
    <ComboboxPrimitive.Group
      data-slot="combobox-group"
      className={cn("scroll-my-1.5 p-1.5", className)}
      {...props} />
  )
}

function ComboboxLabel({
  className,
  ...props
}) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      className={cn("px-3 py-2.5 text-xs text-muted-foreground", className)}
      {...props} />
  )
}

function ComboboxSeparator({
  className,
  ...props
}) {
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      className={cn("pointer-events-none -mx-1.5 my-1.5 h-px bg-border", className)}
      {...props} />
  )
}

function ComboboxEmpty({
  className,
  ...props
}) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn("px-3 py-2.5 text-sm text-center text-muted-foreground", className)}
      {...props} />
  )
}

function ComboboxScrollUpButton({
  className,
  ...props
}) {
  return (
    <ComboboxPrimitive.ScrollUpArrow
      data-slot="combobox-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}>
      <ChevronUpIcon />
    </ComboboxPrimitive.ScrollUpArrow>
  )
}

function ComboboxScrollDownButton({
  className,
  ...props
}) {
  return (
    <ComboboxPrimitive.ScrollDownArrow
      data-slot="combobox-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}>
      <ChevronDownIcon />
    </ComboboxPrimitive.ScrollDownArrow>
  )
}

export {
  Combobox,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxContent,
  ComboboxFilter,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxSeparator,
  ComboboxEmpty,
  ComboboxValue,
  ComboboxScrollUpButton,
  ComboboxScrollDownButton,
}