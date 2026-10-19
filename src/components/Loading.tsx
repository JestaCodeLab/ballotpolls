import type { ReactNode } from 'react'
import { Logo } from './Layout'

// A pale block that stands in for text, a photo or a number while data loads.
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton rounded-lg ${className}`} />
}

// Wraps a skeleton so screen readers hear one "Loading" message instead of a page of empty blocks.
export function Loading({ label = 'Loading', children }: { label?: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}…</span>
      <div aria-hidden="true">{children}</div>
    </div>
  )
}

const card = 'rounded-[14px] border border-line bg-white'

/* ---------- Pieces that mirror real layouts ---------- */

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`${card} p-5`}>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-8 w-28" />
        </div>
      ))}
    </div>
  )
}

export function ElectionRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3.5">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`${card} flex flex-wrap items-center gap-x-8 gap-y-4 px-6 py-5`}>
          <Skeleton className="h-[68px] w-[120px] rounded-lg" />
          <div className="min-w-[240px] flex-[2]">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="mt-2.5 h-4 w-72 max-w-full" />
          </div>
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className="min-w-[100px] flex-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-2 h-5 w-14" />
            </div>
          ))}
          <Skeleton className="h-11 w-24 rounded-[10px]" />
        </div>
      ))}
    </div>
  )
}

export function CandidateGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`${card} overflow-hidden`}>
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-2 px-4 pb-3.5 pt-3">
            <Skeleton className="h-5 w-3/4" />
            <div className="flex gap-1.5">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className={`${card} p-6`}>
      <div className="mb-5 flex justify-between gap-3">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex h-[260px] items-end gap-4 border-b border-line">
        {[85, 60, 38, 18, 50].map((h, i) => (
          <div key={i} className="flex h-full flex-1 items-end justify-center">
            <div className="skeleton w-14 rounded-t-[4px]" style={{ height: `${h}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-around">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-6 border-t border-[#eef2f0] px-3 py-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="ml-auto h-4 w-20" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      ))}
    </div>
  )
}

// The table view's loading state: a card holding a few ghost rows.
export function TableViewSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className={`${card} p-2`}>
      <TableSkeleton rows={rows} />
    </div>
  )
}

/* ---------- Whole-page skeletons, for pages that cannot show anything until their data is in ---------- */

function HeaderSkeleton() {
  return (
    <div>
      <Skeleton className="h-4 w-36" />
      <Skeleton className="mt-3 h-9 w-80 max-w-full" />
      <Skeleton className="mt-3 h-4 w-64 max-w-full" />
    </div>
  )
}

// An election page: a wide list card and a narrow side column.
export function DetailPageSkeleton() {
  return (
    <Loading>
      <div className="flex flex-col gap-6">
        <HeaderSkeleton />
        <div className="flex flex-wrap items-start gap-6">
          <div className={`${card} min-w-[320px] flex-[2] space-y-5 p-6`}>
            <Skeleton className="h-6 w-40" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3 border-t border-line pt-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-11 w-36 rounded-[10px]" />
              </div>
            ))}
          </div>
          <div className="flex min-w-[280px] flex-1 flex-col gap-4">
            <Skeleton className="h-44 rounded-[14px]" />
            <Skeleton className="h-28 rounded-[14px]" />
            <Skeleton className="h-24 rounded-[14px]" />
          </div>
        </div>
      </div>
    </Loading>
  )
}

// A form page: stacked cards on the left (60%), a side column on the right (40%).
export function FormPageSkeleton() {
  return (
    <Loading>
      <div className="flex flex-col gap-6">
        <HeaderSkeleton />
        <div className="grid items-start gap-6 lg:grid-cols-5">
          <div className="flex flex-col gap-5 lg:col-span-3">
            {[0, 1].map((i) => (
              <div key={i} className={`${card} space-y-4 p-6`}>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-[46px] w-full rounded-[10px]" />
                <Skeleton className="h-[46px] w-full rounded-[10px]" />
              </div>
            ))}
          </div>
          <div className={`${card} space-y-4 p-6 lg:col-span-2`}>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-[220px] w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </Loading>
  )
}

// Shown for the whole screen while the app checks whether someone is already signed in.
export function AppLoader() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ground">
      <div className="animate-pulse motion-reduce:animate-none">
        <Logo />
      </div>
      <div aria-hidden="true" className="skeleton h-1 w-40 rounded-full" />
      <span className="sr-only">Loading Tally…</span>
    </div>
  )
}
