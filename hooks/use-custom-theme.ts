"use client"

import { useState, useEffect, useCallback } from "react"

interface CustomTheme {
  id: string
  name: string
  colors: Record<string, string>
  createdAt: string
  updatedAt: string
}

interface UseCustomThemeReturn {
  customThemes: CustomTheme[]
  activeCustomTheme: string | null
  createTheme: (name: string, colors: Record<string, string>) => void
  updateTheme: (id: string, updates: Partial<Pick<CustomTheme, "name" | "colors">>) => void
  deleteTheme: (id: string) => void
  applyTheme: (id: string) => void
  clearActiveTheme: () => void
  exportThemes: () => void
  importThemes: (themes: CustomTheme[]) => void
}

const STORAGE_KEY = "custom-themes"
const ACTIVE_THEME_KEY = "active-custom-theme"

export function useCustomTheme(): UseCustomThemeReturn {
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([])
  const [activeCustomTheme, setActiveCustomTheme] = useState<string | null>(null)

  // Load themes from localStorage on mount
  useEffect(() => {
    try {
      const savedThemes = localStorage.getItem(STORAGE_KEY)
      if (savedThemes) {
        setCustomThemes(JSON.parse(savedThemes))
      }

      const activeTheme = localStorage.getItem(ACTIVE_THEME_KEY)
      if (activeTheme) {
        setActiveCustomTheme(activeTheme)
      }
    } catch (error) {
      console.error("Failed to load custom themes:", error)
    }
  }, [])

  // Save themes to localStorage whenever they change
  const saveThemes = useCallback((themes: CustomTheme[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(themes))
      setCustomThemes(themes)
    } catch (error) {
      console.error("Failed to save custom themes:", error)
    }
  }, [])

  // Apply theme colors to CSS variables
  const applyThemeColors = useCallback((colors: Record<string, string>) => {
    const root = document.documentElement
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value)
    })
  }, [])

  // Clear theme colors from CSS variables
  const clearThemeColors = useCallback(() => {
    const root = document.documentElement
    const defaultColors = [
      "primary",
      "secondary",
      "accent",
      "background",
      "foreground",
      "muted",
      "muted-foreground",
      "border",
      "input",
      "ring",
    ]
    defaultColors.forEach((key) => {
      root.style.removeProperty(`--${key}`)
    })
  }, [])

  // Create a new theme
  const createTheme = useCallback(
    (name: string, colors: Record<string, string>) => {
      const newTheme: CustomTheme = {
        id: `theme-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        colors,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const updatedThemes = [newTheme, ...customThemes]
      saveThemes(updatedThemes)
    },
    [customThemes, saveThemes],
  )

  // Update an existing theme
  const updateTheme = useCallback(
    (id: string, updates: Partial<Pick<CustomTheme, "name" | "colors">>) => {
      const updatedThemes = customThemes.map((theme) =>
        theme.id === id
          ? {
              ...theme,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : theme,
      )
      saveThemes(updatedThemes)

      // If this is the active theme, reapply the colors
      if (activeCustomTheme === id && updates.colors) {
        applyThemeColors(updates.colors)
      }
    },
    [customThemes, saveThemes, activeCustomTheme, applyThemeColors],
  )

  // Delete a theme
  const deleteTheme = useCallback(
    (id: string) => {
      const updatedThemes = customThemes.filter((theme) => theme.id !== id)
      saveThemes(updatedThemes)

      // If this was the active theme, clear it
      if (activeCustomTheme === id) {
        clearActiveTheme()
      }
    },
    [customThemes, saveThemes, activeCustomTheme],
  )

  // Apply a theme
  const applyTheme = useCallback(
    (id: string) => {
      const theme = customThemes.find((t) => t.id === id)
      if (theme) {
        applyThemeColors(theme.colors)
        setActiveCustomTheme(id)
        localStorage.setItem(ACTIVE_THEME_KEY, id)
      }
    },
    [customThemes, applyThemeColors],
  )

  // Clear active theme
  const clearActiveTheme = useCallback(() => {
    clearThemeColors()
    setActiveCustomTheme(null)
    localStorage.removeItem(ACTIVE_THEME_KEY)
  }, [clearThemeColors])

  // Export themes
  const exportThemes = useCallback(() => {
    try {
      const dataStr = JSON.stringify(customThemes, null, 2)
      const dataBlob = new Blob([dataStr], { type: "application/json" })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `custom-themes-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to export themes:", error)
    }
  }, [customThemes])

  // Import themes
  const importThemes = useCallback(
    (themes: CustomTheme[]) => {
      try {
        // Validate themes structure
        const validThemes = themes.filter(
          (theme) => theme.id && theme.name && theme.colors && typeof theme.colors === "object",
        )

        if (validThemes.length > 0) {
          const updatedThemes = [...customThemes, ...validThemes]
          saveThemes(updatedThemes)
        }
      } catch (error) {
        console.error("Failed to import themes:", error)
      }
    },
    [customThemes, saveThemes],
  )

  // Apply active theme on mount
  useEffect(() => {
    if (activeCustomTheme) {
      const theme = customThemes.find((t) => t.id === activeCustomTheme)
      if (theme) {
        applyThemeColors(theme.colors)
      }
    }
  }, [activeCustomTheme, customThemes, applyThemeColors])

  return {
    customThemes,
    activeCustomTheme,
    createTheme,
    updateTheme,
    deleteTheme,
    applyTheme,
    clearActiveTheme,
    exportThemes,
    importThemes,
  }
}
