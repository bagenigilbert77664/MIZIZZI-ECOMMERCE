"use client"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"

function ThemeProvider(props: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{props.children}</NextThemesProvider>
}

export default ThemeProvider
