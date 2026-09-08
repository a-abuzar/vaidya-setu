"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

import { cn } from "@/lib/utils";

function Tabs({
  className,
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex h-14 items-center justify-center gap-1 rounded-2xl bg-muted p-1.5 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function TabsTab({
  className,
  ...props
}: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-tab"
      className={cn(
        "inline-flex h-full flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer select-none text-muted-foreground hover:text-foreground",
        "data-[active]:border data-[active]:border-border/70 data-[active]:bg-card data-[active]:text-primary data-[active]:shadow-xs",
        "aria-selected:border aria-selected:border-border/70 aria-selected:bg-card aria-selected:text-primary aria-selected:shadow-xs",
        "data-[selected]:border data-[selected]:border-border/70 data-[selected]:bg-card data-[selected]:text-primary data-[selected]:shadow-xs",
        "disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    />
  );
}

function TabsPanel({
  className,
  ...props
}: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-panel"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTab, TabsPanel };