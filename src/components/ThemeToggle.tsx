'use client'

import { Moon, Sun } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'

// The theme is the `dark` class on <html>, set before the first paint by the locale layout's
// script. The icons follow it through `dark:`, so nothing here reads the theme while rendering
// and the server's HTML always matches.
export function ThemeToggle() {
  const t = useTranslations('ThemeToggle')

  function toggle() {
    const dark = document.documentElement.classList.toggle('dark')
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    } catch {
      // Storage blocked (a private window): the choice lasts until the page reloads.
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={t('label')}>
      <Sun className="dark:hidden" />
      <Moon className="hidden dark:block" />
    </Button>
  )
}
