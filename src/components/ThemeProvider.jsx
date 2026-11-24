"use client";

import React, { createContext, useContext, useEffect, useState } from "react"

const initialState = {
    theme: "system",
    effectiveTheme: "light",
    setTheme: () => null,
}

const ThemeProviderContext = createContext(initialState)

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "vite-ui-theme",
    ...props
}) {
    const [theme, setTheme] = useState("light")
    const [effectiveTheme, setEffectiveTheme] = useState("light")

    useEffect(() => {
        const root = window.document.documentElement
        root.classList.remove("light", "dark")
        root.classList.add("light")
        setEffectiveTheme("light")
    }, []) // Run once to enforce light mode

    const value = {
        theme: "light",
        effectiveTheme: "light",
        setTheme: () => null, // Disable changing theme
    }

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext)

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider")

    return context
}
