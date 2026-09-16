'use client'

import Link from 'next/link'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'

export type ListAction =
  | 'edit' | 'delete' | 'activate' | 'deactivate' | 'view' | 'save'
  | 'cancel' | 'download' | 'complete' | 'calendar' | 'documents' | 'open'

type ActionProps = {
  action: ListAction
  label: string
}

type ListActionButtonProps = ActionProps & {
  busy?: boolean
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'title' | 'aria-label'>

type ListActionLinkProps = ActionProps & {
  href: string
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'title' | 'aria-label' | 'href'>

const tones = {
  blue: 'border-blue-200 bg-blue-50/60 text-blue-700 hover:border-blue-300 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:border-blue-600 dark:hover:bg-blue-900/50',
  red: 'border-red-200 bg-red-50/60 text-red-700 hover:border-red-300 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300 dark:hover:border-red-600 dark:hover:bg-red-900/50',
  green: 'border-green-200 bg-green-50/60 text-green-700 hover:border-green-300 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300 dark:hover:border-green-600 dark:hover:bg-green-900/50',
  amber: 'border-amber-200 bg-amber-50/60 text-amber-700 hover:border-amber-300 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:border-amber-600 dark:hover:bg-amber-900/50',
  teal: 'border-teal-200 bg-teal-50/60 text-teal-700 hover:border-teal-300 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-300 dark:hover:border-teal-600 dark:hover:bg-teal-900/50',
  neutral: 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-700',
}

const actionTones: Record<ListAction, keyof typeof tones> = {
  edit: 'blue', delete: 'red', activate: 'green', deactivate: 'amber',
  view: 'neutral', save: 'teal', cancel: 'neutral', download: 'neutral',
  complete: 'green', calendar: 'teal', documents: 'neutral', open: 'neutral',
}

function actionClassName(action: ListAction, className = '') {
  return `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors sm:h-9 sm:w-9 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-teal-400 dark:focus-visible:ring-offset-gray-800 disabled:cursor-not-allowed disabled:opacity-45 ${tones[actionTones[action]]} ${className}`
}

function ActionIcon({ action, busy = false }: { action: ListAction; busy?: boolean }) {
  if (busy) {
    return (
      <svg className="h-[18px] w-[18px] animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {action === 'edit' && <><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z" /><path d="m4 15 4 4" /></>}
      {action === 'delete' && <><path d="M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M5 6l1 14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-14M10 10v7M14 10v7" /></>}
      {action === 'activate' && <path d="m8 5 11 7-11 7z" />}
      {action === 'deactivate' && <><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></>}
      {action === 'view' && <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>}
      {action === 'save' && <path d="m5 12 4 4L19 6" />}
      {action === 'cancel' && <path d="m6 6 12 12M18 6 6 18" />}
      {action === 'download' && <><path d="M12 3v12m-5-5 5 5 5-5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></>}
      {action === 'complete' && <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>}
      {action === 'calendar' && <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18m-14 4h3m4 0h3m-10 3h3" /></>}
      {action === 'documents' && <><path d="M8 3h8l4 4v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 0v5h5M10 12h6m-6 4h6M3 7v14a1 1 0 0 0 1 1h11" /></>}
      {action === 'open' && <><path d="M14 3h7v7M21 3l-11 11M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" /></>}
    </svg>
  )
}

function useActionTooltip<T extends HTMLElement>(label: string) {
  const id = useId()
  const triggerRef = useRef<T>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hovered = useRef(false)
  const focused = useRef(false)
  const [open, setOpen] = useState(false)

  function clearCloseTimer() {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current)
    closeTimer.current = null
  }

  function hide() {
    clearCloseTimer()
    setOpen(false)
  }

  function scheduleClose() {
    clearCloseTimer()
    if (!hovered.current && !focused.current) {
      closeTimer.current = setTimeout(() => setOpen(false), 120)
    }
  }

  useEffect(() => () => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current)
  }, [])

  useLayoutEffect(() => {
    if (!open) return

    function positionTooltip() {
      const trigger = triggerRef.current
      const tooltip = tooltipRef.current
      if (!trigger || !tooltip) return

      const anchor = trigger.getBoundingClientRect()
      const width = document.documentElement.clientWidth
      const height = window.innerHeight
      const size = tooltip.getBoundingClientRect()
      const left = Math.max(8, Math.min(anchor.left + anchor.width / 2 - size.width / 2, width - size.width - 8))
      const preferredTop = anchor.top >= size.height + 16 ? anchor.top - size.height - 8 : anchor.bottom + 8
      const top = Math.max(8, Math.min(preferredTop, height - size.height - 8))

      tooltip.style.left = `${left}px`
      tooltip.style.top = `${top}px`
      tooltip.style.visibility = anchor.bottom < 0 || anchor.top > height || anchor.right < 0 || anchor.left > width ? 'hidden' : 'visible'
    }

    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    positionTooltip()
    window.addEventListener('resize', positionTooltip)
    window.addEventListener('scroll', positionTooltip, true)
    document.addEventListener('keydown', dismissOnEscape)
    return () => {
      window.removeEventListener('resize', positionTooltip)
      window.removeEventListener('scroll', positionTooltip, true)
      document.removeEventListener('keydown', dismissOnEscape)
    }
  }, [open, label])

  const tooltip = open && typeof document !== 'undefined' ? createPortal(
    <div
      ref={tooltipRef}
      id={id}
      role="tooltip"
      className="fixed z-[100] max-w-[min(18rem,calc(100vw-16px))] break-words rounded-md bg-gray-900 px-3 py-2 text-left text-xs font-medium leading-5 text-white shadow-lg dark:bg-gray-100 dark:text-gray-900"
      style={{ left: 0, top: 0, visibility: 'hidden' }}
      onMouseEnter={clearCloseTimer}
      onMouseLeave={scheduleClose}
    >
      {label}
    </div>,
    document.body,
  ) : null

  return {
    triggerRef,
    tooltip,
    describedBy: open ? id : undefined,
    hide,
    onMouseEnter() { hovered.current = true; clearCloseTimer(); setOpen(true) },
    onMouseLeave() { hovered.current = false; scheduleClose() },
    onFocus() { focused.current = true; clearCloseTimer(); setOpen(true) },
    onBlur() { focused.current = false; scheduleClose() },
  }
}

export function ListActionButton({ action, label, busy = false, disabled, type = 'button', className, onMouseEnter, onMouseLeave, onFocus, onBlur, onClick, ...props }: ListActionButtonProps) {
  const { triggerRef, tooltip, describedBy, hide, onMouseEnter: showOnHover, onMouseLeave: leaveHover, onFocus: showOnFocus, onBlur: leaveFocus } = useActionTooltip<HTMLButtonElement>(label)

  return (
    <>
      <button
        {...props}
        ref={triggerRef}
        type={type}
        disabled={disabled || busy}
        aria-label={label}
        aria-busy={busy || props['aria-busy']}
        aria-describedby={[props['aria-describedby'], describedBy].filter(Boolean).join(' ') || undefined}
        className={actionClassName(action, className)}
        onMouseEnter={(event) => { onMouseEnter?.(event); if (!event.defaultPrevented) showOnHover() }}
        onMouseLeave={(event) => { onMouseLeave?.(event); leaveHover() }}
        onFocus={(event) => { onFocus?.(event); if (!event.defaultPrevented) showOnFocus() }}
        onBlur={(event) => { onBlur?.(event); leaveFocus() }}
        onClick={(event) => { hide(); onClick?.(event) }}
      >
        <ActionIcon action={action} busy={busy} />
      </button>
      {tooltip}
    </>
  )
}

export function ListActionLink({ action, label, href, className, onMouseEnter, onMouseLeave, onFocus, onBlur, onClick, ...props }: ListActionLinkProps) {
  const { triggerRef, tooltip, describedBy, hide, onMouseEnter: showOnHover, onMouseLeave: leaveHover, onFocus: showOnFocus, onBlur: leaveFocus } = useActionTooltip<HTMLAnchorElement>(label)

  return (
    <>
      <Link
        {...props}
        ref={triggerRef}
        href={href}
        aria-label={label}
        aria-describedby={[props['aria-describedby'], describedBy].filter(Boolean).join(' ') || undefined}
        className={actionClassName(action, className)}
        onMouseEnter={(event) => { onMouseEnter?.(event); if (!event.defaultPrevented) showOnHover() }}
        onMouseLeave={(event) => { onMouseLeave?.(event); leaveHover() }}
        onFocus={(event) => { onFocus?.(event); if (!event.defaultPrevented) showOnFocus() }}
        onBlur={(event) => { onBlur?.(event); leaveFocus() }}
        onClick={(event) => { hide(); onClick?.(event) }}
      >
        <ActionIcon action={action} />
      </Link>
      {tooltip}
    </>
  )
}
