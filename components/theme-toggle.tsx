"use client"
import { Moon, Sun, Monitor, Palette } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCustomTheme } from "@/hooks/use-custom-theme"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const { customThemes, activeCustomTheme, applyTheme, clearActiveTheme } = useCustomTheme()

  const recentThemes = customThemes.slice(0, 5) // Show up to 5 recent custom themes

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>System Themes</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
          {theme === "light" && !activeCustomTheme && " ✓"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
          {theme === "dark" && !activeCustomTheme && " ✓"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          System
          {theme === "system" && !activeCustomTheme && " ✓"}
        </DropdownMenuItem>

        {recentThemes.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Custom Themes</DropdownMenuLabel>
            {recentThemes.map((customTheme) => (
              <DropdownMenuItem key={customTheme.id} onClick={() => applyTheme(customTheme.id)}>
                <Palette className="mr-2 h-4 w-4" />
                {customTheme.name}
                {activeCustomTheme === customTheme.id && " ✓"}
              </DropdownMenuItem>
            ))}
            {activeCustomTheme && (
              <DropdownMenuItem onClick={clearActiveTheme}>
                <span className="mr-2 h-4 w-4" />
                Clear Custom Theme
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
