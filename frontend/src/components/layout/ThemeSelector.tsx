import { Menu } from "@base-ui/react/menu";
import { Check, ChevronUp, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

const themes = [
  { value: "light", label: "ライト", icon: Sun },
  { value: "dark", label: "ダーク", icon: Moon },
  { value: "system", label: "システム", icon: Monitor },
] as const;

export function ThemeSelector({ iconOnly = false }: { iconOnly?: boolean }) {
  const { theme = "system", setTheme } = useTheme();
  const systemTheme = themes.find((t) => t.value === "system")!;
  const currentTheme = themes.find((option) => option.value === theme) ?? systemTheme;
  const ThemeIcon = currentTheme.icon;
  const triggerLabel = `テーマ：${currentTheme.label}`;

  return (
    <Menu.Root>
      {iconOnly ? (
        <Menu.Trigger
          render={<Button variant="ghost" size="icon-xl" title={triggerLabel} />}
          aria-label={triggerLabel}
        >
          <ThemeIcon className="size-5" />
        </Menu.Trigger>
      ) : (
        <Menu.Trigger
          render={<Button variant="ghost" size="lg" className="w-full justify-start" />}
        >
          <ThemeIcon className="mr-1 size-4" />
          {triggerLabel}
          <ChevronUp className="text-muted-foreground ml-auto size-4" />
        </Menu.Trigger>
      )}
      <Menu.Portal>
        <Menu.Positioner
          className="z-50 outline-none"
          side={iconOnly ? "bottom" : "top"}
          sideOffset={6}
          align={iconOnly ? "end" : "start"}
        >
          <Menu.Popup className="bg-sidebar text-popover-foreground ring-foreground/10 min-w-48 rounded-xl p-1 shadow-lg ring-1 outline-none">
            <Menu.RadioGroup value={currentTheme.value} onValueChange={setTheme}>
              {themes.map((option) => {
                const Icon = option.icon;
                return (
                  <Menu.RadioItem
                    className="data-highlighted:bg-accent flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2.5 text-sm outline-none select-none"
                    key={option.value}
                    value={option.value}
                    closeOnClick
                  >
                    <Icon className="size-4" />
                    {option.label}
                    <Menu.RadioItemIndicator className="ml-auto">
                      <Check className="text-brand size-4" aria-hidden />
                    </Menu.RadioItemIndicator>
                  </Menu.RadioItem>
                );
              })}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
