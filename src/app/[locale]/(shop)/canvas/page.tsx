import config from '@payload-config'
import { cn } from 'cn'
import { ShoppingBag } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import type { ReactNode } from 'react'

import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'

// Every storefront component in every variant and state (RULES.md): a component a task adds
// gets a section here in the same pull request.

export async function generateMetadata() {
  const t = await getTranslations('Canvas')
  return { title: t('title'), robots: { index: false, follow: false } }
}

// In production only someone signed in to the admin sees the canvas — every user is an owner or
// a cosmetologist; locally anyone does.
async function requireAdminUser() {
  if (process.env.NODE_ENV !== 'production') return
  // Headers first: they make `next build` skip prerendering this page instead of reaching for a
  // database the build does not have.
  const requestHeaders = await headers()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: requestHeaders })
  if (!user) notFound()
}

const colors = [
  ['background', 'bg-background'],
  ['foreground', 'bg-foreground'],
  ['card', 'bg-card'],
  ['primary', 'bg-primary'],
  ['primary-foreground', 'bg-primary-foreground'],
  ['secondary', 'bg-secondary'],
  ['muted', 'bg-muted'],
  ['muted-foreground', 'bg-muted-foreground'],
  ['accent', 'bg-accent'],
  ['accent-foreground', 'bg-accent-foreground'],
  ['destructive', 'bg-destructive'],
  ['border', 'bg-border'],
  ['input', 'bg-input'],
  ['ring', 'bg-ring'],
] as const

const textSizes = ['text-5xl', 'text-4xl', 'text-3xl', 'text-2xl', 'text-xl', 'text-lg'] as const

const variants = ['default', 'secondary', 'outline', 'ghost', 'link'] as const
const sizes = ['sm', 'default', 'lg'] as const

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t py-8">
      <h2 className="mb-6 text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

function Specimen({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

export default async function CanvasPage() {
  await requireAdminUser()
  const t = await getTranslations('Canvas')

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between gap-4 py-4">
        <Logo size="sm" />
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <div className="pt-8 pb-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('title')}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{t('description')}</p>
      </div>

      <Section title={t('colors')}>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {colors.map(([name, className]) => (
            <li key={name} className="flex flex-col gap-2">
              <span className={cn('h-14 rounded-lg border', className)} />
              <span className="text-xs break-all text-muted-foreground">{name}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t('typography')}>
        <div className="flex flex-col gap-5">
          {textSizes.map((size) => (
            <Specimen key={size} label={size}>
              <p className={cn(size, 'leading-tight font-semibold tracking-tight')}>{t('heading')}</p>
            </Specimen>
          ))}
          <Specimen label="text-base">
            <p className="max-w-[65ch] leading-relaxed">{t('body')}</p>
          </Specimen>
          <Specimen label="text-sm text-muted-foreground">
            <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">{t('body')}</p>
          </Specimen>
          <Specimen label="font-light / font-normal / font-medium / font-semibold">
            <p className="text-2xl font-light">{t('glyphs')}</p>
            <p className="text-2xl font-normal">{t('glyphs')}</p>
            <p className="text-2xl font-medium">{t('glyphs')}</p>
            <p className="text-2xl font-semibold">{t('glyphs')}</p>
          </Specimen>
        </div>
      </Section>

      <Section title="Logo">
        <div className="flex flex-col gap-5">
          <Specimen label="size=sm">
            <Logo size="sm" />
          </Specimen>
          <Specimen label="size=md">
            <Logo size="md" />
          </Specimen>
        </div>
      </Section>

      <Section title="Button">
        <div className="flex flex-col gap-6">
          {variants.map((variant) => (
            <Specimen key={variant} label={`variant=${variant}`}>
              {sizes.map((size) => (
                <Button key={size} variant={variant} size={size}>
                  {t('buttonLabel')}
                </Button>
              ))}
              <Button variant={variant} size="icon" aria-label={t('buttonIcon')}>
                <ShoppingBag />
              </Button>
              <Button variant={variant} disabled>
                {t('buttonLabel')}
              </Button>
            </Specimen>
          ))}
        </div>
      </Section>

      <Section title="LanguageSwitcher">
        <LanguageSwitcher />
      </Section>

      <Section title="ThemeToggle">
        <ThemeToggle />
      </Section>
    </div>
  )
}
