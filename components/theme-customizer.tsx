"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Palette, Save, Download, Upload, Trash2, Eye, EyeOff, Copy, Check, RefreshCw, Sparkles } from "lucide-react"
import { useCustomTheme } from "@/hooks/use-custom-theme"

interface ColorPreset {
  name: string
  colors: Record<string, string>
  description: string
}

const colorPresets: ColorPreset[] = [
  {
    name: "Ocean Blue",
    description: "Professional blue theme",
    colors: {
      primary: "210 100% 50%",
      secondary: "210 40% 96%",
      accent: "210 40% 96%",
      background: "0 0% 100%",
      foreground: "210 40% 8%",
      muted: "210 40% 96%",
      "muted-foreground": "215.4 16.3% 46.9%",
      border: "214.3 31.8% 91.4%",
      input: "214.3 31.8% 91.4%",
      ring: "210 100% 50%",
    },
  },
  {
    name: "Forest Green",
    description: "Nature-inspired green theme",
    colors: {
      primary: "142 76% 36%",
      secondary: "138 40% 96%",
      accent: "138 40% 96%",
      background: "0 0% 100%",
      foreground: "142 40% 8%",
      muted: "138 40% 96%",
      "muted-foreground": "138 16.3% 46.9%",
      border: "138 31.8% 91.4%",
      input: "138 31.8% 91.4%",
      ring: "142 76% 36%",
    },
  },
  {
    name: "Sunset Orange",
    description: "Warm orange theme",
    colors: {
      primary: "25 95% 53%",
      secondary: "25 40% 96%",
      accent: "25 40% 96%",
      background: "0 0% 100%",
      foreground: "25 40% 8%",
      muted: "25 40% 96%",
      "muted-foreground": "25 16.3% 46.9%",
      border: "25 31.8% 91.4%",
      input: "25 31.8% 91.4%",
      ring: "25 95% 53%",
    },
  },
  {
    name: "Purple Haze",
    description: "Modern purple theme",
    colors: {
      primary: "271 81% 56%",
      secondary: "271 40% 96%",
      accent: "271 40% 96%",
      background: "0 0% 100%",
      foreground: "271 40% 8%",
      muted: "271 40% 96%",
      "muted-foreground": "271 16.3% 46.9%",
      border: "271 31.8% 91.4%",
      input: "271 31.8% 91.4%",
      ring: "271 81% 56%",
    },
  },
  {
    name: "Rose Gold",
    description: "Elegant rose gold theme",
    colors: {
      primary: "346 77% 49%",
      secondary: "346 40% 96%",
      accent: "346 40% 96%",
      background: "0 0% 100%",
      foreground: "346 40% 8%",
      muted: "346 40% 96%",
      "muted-foreground": "346 16.3% 46.9%",
      border: "346 31.8% 91.4%",
      input: "346 31.8% 91.4%",
      ring: "346 77% 49%",
    },
  },
]

export function ThemeCustomizer() {
  const {
    customThemes,
    activeCustomTheme,
    createTheme,
    updateTheme,
    deleteTheme,
    applyTheme,
    clearActiveTheme,
    exportThemes,
    importThemes,
  } = useCustomTheme()

  const [isOpen, setIsOpen] = useState(false)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [themeName, setThemeName] = useState("")
  const [editingTheme, setEditingTheme] = useState<string | null>(null)
  const [copiedTheme, setCopiedTheme] = useState<string | null>(null)
  const [colors, setColors] = useState({
    primary: "222.2 47.4% 11.2%",
    secondary: "210 40% 96%",
    accent: "210 40% 96%",
    background: "0 0% 100%",
    foreground: "222.2 84% 4.9%",
    muted: "210 40% 96%",
    "muted-foreground": "215.4 16.3% 46.9%",
    border: "214.3 31.8% 91.4%",
    input: "214.3 31.8% 91.4%",
    ring: "222.2 84% 4.9%",
  })

  const [previewColors, setPreviewColors] = useState(colors)

  useEffect(() => {
    if (isPreviewMode) {
      // Apply preview colors to CSS variables
      const root = document.documentElement
      Object.entries(previewColors).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value)
      })
    } else if (!activeCustomTheme) {
      // Reset to default theme when not in preview mode and no active custom theme
      const root = document.documentElement
      Object.keys(colors).forEach((key) => {
        root.style.removeProperty(`--${key}`)
      })
    }
  }, [previewColors, isPreviewMode, activeCustomTheme, colors])

  const handleColorChange = (colorKey: string, value: string) => {
    const newColors = { ...colors, [colorKey]: value }
    setColors(newColors)
    if (isPreviewMode) {
      setPreviewColors(newColors)
    }
  }

  const togglePreview = () => {
    if (isPreviewMode) {
      setIsPreviewMode(false)
      // Reset preview colors
      if (!activeCustomTheme) {
        const root = document.documentElement
        Object.keys(colors).forEach((key) => {
          root.style.removeProperty(`--${key}`)
        })
      }
    } else {
      setIsPreviewMode(true)
      setPreviewColors(colors)
    }
  }

  const handleSaveTheme = () => {
    if (!themeName.trim()) return

    if (editingTheme) {
      updateTheme(editingTheme, { name: themeName, colors })
    } else {
      createTheme(themeName, colors)
    }

    setThemeName("")
    setEditingTheme(null)
    setIsPreviewMode(false)
  }

  const handleEditTheme = (themeId: string) => {
    const theme = customThemes.find((t) => t.id === themeId)
    if (theme) {
      setThemeName(theme.name)
      setColors(theme.colors)
      setEditingTheme(themeId)
    }
  }

  const handleApplyPreset = (preset: ColorPreset) => {
    setColors(preset.colors)
    setThemeName(preset.name)
    if (isPreviewMode) {
      setPreviewColors(preset.colors)
    }
  }

  const handleCopyTheme = async (theme: any) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(theme, null, 2))
      setCopiedTheme(theme.id)
      setTimeout(() => setCopiedTheme(null), 2000)
    } catch (err) {
      console.error("Failed to copy theme:", err)
    }
  }

  const handleImportTheme = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const importedTheme = JSON.parse(text)
      if (importedTheme.name && importedTheme.colors) {
        setThemeName(importedTheme.name + " (Imported)")
        setColors(importedTheme.colors)
      }
    } catch (err) {
      console.error("Failed to import theme:", err)
    }
  }

  const resetToDefaults = () => {
    setColors({
      primary: "222.2 47.4% 11.2%",
      secondary: "210 40% 96%",
      accent: "210 40% 96%",
      background: "0 0% 100%",
      foreground: "222.2 84% 4.9%",
      muted: "210 40% 96%",
      "muted-foreground": "215.4 16.3% 46.9%",
      border: "214.3 31.8% 91.4%",
      input: "214.3 31.8% 91.4%",
      ring: "222.2 84% 4.9%",
    })
    setThemeName("")
    setEditingTheme(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Palette className="h-4 w-4 mr-2" />
          Customize Theme
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Theme Customizer
          </DialogTitle>
          <DialogDescription>
            Create and manage custom color themes. Changes are applied in real-time when preview is enabled.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Theme Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Your Custom Themes</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleImportTheme}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportThemes()}>
                  <Download className="h-4 w-4 mr-2" />
                  Export All
                </Button>
              </div>
            </div>

            {customThemes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {customThemes.map((theme) => (
                  <Card key={theme.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{theme.name}</h4>
                        <div className="flex gap-1">
                          {copiedTheme === theme.id ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyTheme(theme)}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTheme(theme.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Palette className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTheme(theme.id)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-1 mb-3">
                        {Object.entries(theme.colors)
                          .slice(0, 6)
                          .map(([key, value]) => (
                            <div
                              key={key}
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: `hsl(${value})` }}
                              title={key}
                            />
                          ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => applyTheme(theme.id)}
                          variant={activeCustomTheme === theme.id ? "default" : "outline"}
                        >
                          {activeCustomTheme === theme.id ? "Active" : "Apply"}
                        </Button>
                        {activeCustomTheme === theme.id && (
                          <Button size="sm" variant="outline" onClick={clearActiveTheme}>
                            Clear
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <Palette className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No custom themes yet. Create your first theme below!</p>
                </CardContent>
              </Card>
            )}
          </div>

          <Separator />

          {/* Color Presets */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Color Presets</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {colorPresets.map((preset) => (
                <Card key={preset.name} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4" onClick={() => handleApplyPreset(preset)}>
                    <h4 className="font-medium mb-1">{preset.name}</h4>
                    <p className="text-sm text-gray-600 mb-3">{preset.description}</p>
                    <div className="flex gap-1">
                      {Object.entries(preset.colors)
                        .slice(0, 6)
                        .map(([key, value]) => (
                          <div
                            key={key}
                            className="w-4 h-4 rounded border"
                            style={{ backgroundColor: `hsl(${value})` }}
                            title={key}
                          />
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Theme Creator */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">{editingTheme ? "Edit Theme" : "Create New Theme"}</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={resetToDefaults}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button variant="outline" size="sm" onClick={togglePreview}>
                  {isPreviewMode ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Stop Preview
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </>
                  )}
                </Button>
              </div>
            </div>

            {isPreviewMode && (
              <Alert>
                <Eye className="h-4 w-4" />
                <AlertDescription>
                  Preview mode is active. You can see your changes applied to the interface in real-time.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="themeName">Theme Name</Label>
                <Input
                  id="themeName"
                  placeholder="My Awesome Theme"
                  value={themeName}
                  onChange={(e) => setThemeName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(colors).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key} className="capitalize">
                      {key.replace("-", " ")}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={key}
                        value={value}
                        onChange={(e) => handleColorChange(key, e.target.value)}
                        placeholder="0 0% 100%"
                        className="font-mono text-sm"
                      />
                      <div
                        className="w-10 h-10 rounded border flex-shrink-0"
                        style={{ backgroundColor: `hsl(${value})` }}
                        title={`hsl(${value})`}
                      />
                    </div>
                    <p className="text-xs text-gray-500">HSL format: hue saturation% lightness%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
          <Button onClick={handleSaveTheme} disabled={!themeName.trim()}>
            <Save className="h-4 w-4 mr-2" />
            {editingTheme ? "Update Theme" : "Save Theme"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
