import { useId, useState } from 'react'
import type {
  ButtonHTMLAttributes,
  Ref,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, type LucideIcon } from 'lucide-react'
import type { ElectionStatus } from '../lib/api'
import { initials, tone } from '../lib/format'

const base =
  'inline-flex min-h-11 items-center justify-center rounded-[10px] px-5 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'
const variants = {
  primary: 'bg-brand text-white hover:bg-brand-dark',
  secondary: 'border border-field bg-white text-ink hover:bg-ground',
  ghost: 'text-brand hover:bg-brand-tint',
  danger: 'bg-danger text-white hover:bg-[#8f1f19]',
}
type Variant = keyof typeof variants

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; ref?: Ref<HTMLButtonElement> }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}

export function LinkButton({
  variant = 'primary',
  className = '',
  ...props
}: LinkProps & { variant?: Variant }) {
  return <Link className={`${base} ${variants[variant]} ${className}`} {...props} />
}

const field =
  'w-full min-h-[46px] rounded-[10px] border border-field bg-white px-3.5 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-ground disabled:text-muted'

function Label({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      <span className="mb-1.5 block">
        {label} {hint && <span className="font-normal text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

export function Input({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <Label label={label} hint={hint}>
      <input className={field} {...props} />
    </Label>
  )
}

// A password field with a button that shows or hides what has been typed. The button sits outside the
// <label> so it does not become part of the field's accessible name.
export function PasswordInput({
  label,
  hint,
  className = '',
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string; hint?: string }) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  return (
    <div className="text-sm">
      <label htmlFor={id} className="mb-1.5 block font-medium">
        {label} {hint && <span className="font-normal text-muted">{hint}</span>}
      </label>
      <div className="relative">
        <input id={id} type={visible ? 'text' : 'password'} className={`${field} pr-12 ${className}`} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[10px] text-muted hover:bg-ground hover:text-ink"
        >
          {visible ? <EyeOff size={18} strokeWidth={1.8} aria-hidden="true" /> : <Eye size={18} strokeWidth={1.8} aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}

export function Textarea({ label, hint, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  return (
    <Label label={label} hint={hint}>
      <textarea className={`${field} py-3`} {...props} />
    </Label>
  )
}

export { default as Select } from './Select'

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-[14px] border border-line bg-white p-6 ${className}`}>{children}</div>
}

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: ReactNode
  subtitle?: ReactNode
  back?: { to: string; label: string }
  action?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {back && (
          <Link
            to={back.to}
            className="mb-2 inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-line bg-white px-3.5 text-sm font-semibold text-ink hover:border-field hover:bg-ground"
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            {back.label}
          </Link>
        )}
        <h1 className="font-display text-[28px] font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-.5 text-base text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

const chip: Record<ElectionStatus, string> = {
  live: 'bg-accent text-ink',
  upcoming: 'bg-[#dce3f2] text-[#1f3a6b]',
  closed: 'bg-[#e6ede9] text-[#3f4f49]',
}

export function StatusChip({ status }: { status: ElectionStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${chip[status]}`}>{status}</span>
  )
}

export function Avatar({ name, src, size = 40 }: { name: string; src?: string; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.35 }
  return src ? (
    <img src={src} alt="" style={style} className="shrink-0 rounded-full object-cover" />
  ) : (
    <div
      style={style}
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-ink/65 ${tone(name)}`}
    >
      {initials(name)}
    </div>
  )
}

export function Banner({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="rounded-xl bg-brand-tint px-4 py-3.5 text-[15px] font-medium text-[#0b5a43]">
      {children}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  size = 'md',
}: {
  icon: LucideIcon
  title: string
  children?: ReactNode
  action?: ReactNode
  // md: a page-level empty state in a dashed box. sm: inside a card or panel.
  size?: 'md' | 'sm'
}) {
  const big = size === 'md'
  return (
    <div
      className={`flex flex-col items-center text-center ${big ? 'rounded-[14px] border border-dashed border-field bg-white px-6 py-14' : 'px-4 py-8'}`}
    >
      <span className={`flex items-center justify-center rounded-full bg-brand-tint text-brand ${big ? 'h-14 w-14' : 'h-11 w-11'}`}>
        <Icon size={big ? 26 : 22} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <h2 className={`mt-4 font-display font-bold ${big ? 'text-xl' : 'text-base'}`}>{title}</h2>
      {children && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-11 w-[52px] shrink-0"
    >
      <span className={`absolute left-0 top-2.5 h-6 w-[52px] rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-field'}`} />
      <span className={`absolute top-[13px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${checked ? 'left-[31px]' : 'left-[3px]'}`} />
    </button>
  )
}

// Square icon-only controls for table and card actions. The label is the screen-reader name and the tooltip.
const iconTones = {
  muted: 'border-line text-muted hover:border-field hover:bg-ground hover:text-ink',
  // Quiet like the other icons until the pointer or keyboard lands on it, then solid red with a white icon.
  danger: 'border-line text-muted hover:border-danger hover:bg-danger hover:text-white focus-visible:border-danger focus-visible:bg-danger focus-visible:text-white',
  brand: 'border-line text-brand hover:border-brand/40 hover:bg-brand-tint',
}
const iconBase = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-white'

export function IconButton({
  label,
  tone = 'muted',
  children,
  ...props
}: { label: string; tone?: keyof typeof iconTones } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>) {
  return (
    <button type="button" aria-label={label} title={label} className={`${iconBase} ${iconTones[tone]}`} {...props}>
      {children}
    </button>
  )
}

// The same look, for actions that go to another page.
export function IconLink({ label, tone = 'muted', children, ...props }: { label: string; tone?: keyof typeof iconTones } & Omit<LinkProps, 'className'>) {
  return (
    <Link aria-label={label} title={label} className={`${iconBase} ${iconTones[tone]}`} {...props}>
      {children}
    </Link>
  )
}

// The round-cornered icon tile that sits at the top right of a stat card. `onDark` is for the dark highlight card.
export function StatIcon({ icon: Icon, onDark }: { icon: LucideIcon; onDark?: boolean }) {
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${onDark ? 'bg-white/10 text-accent' : 'bg-brand-tint text-brand'}`}>
      <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
    </span>
  )
}

