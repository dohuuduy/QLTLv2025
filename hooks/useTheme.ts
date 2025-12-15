
import { useEffect, useState } from "react"

type Theme = "light" | "dark" | "black" | "system"

export function useSystemTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "system"
  })

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia("(prefers-color-scheme: dark)")

    const removeClasses = () => {
      root.classList.remove("dark", "black")
    }

    const applyTheme = () => {
      removeClasses()

      if (theme === "system") {
        if (media.matches) {
          root.classList.add("dark") // Default to standard dark for system dark
        }
        // else: light mode is default (no class)
      } else if (theme === "dark") {
        root.classList.add("dark")
      } else if (theme === "black") {
        root.classList.add("black")
      }
      // else: light mode
    }

    applyTheme()

    const handleSystemChange = () => {
      if (theme === "system") {
        applyTheme()
      }
    }

    media.addEventListener("change", handleSystemChange)
    return () => media.removeEventListener("change", handleSystemChange)
  }, [theme])

  const setAppTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
  }

  return { theme, setTheme: setAppTheme }
}
