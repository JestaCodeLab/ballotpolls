import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

const LENGTH = 6

// Six single-digit boxes for an SMS code. Typing moves forward, Backspace moves back, and pasting a code fills all six.
export default function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? '')

  const focus = (i: number) => refs.current[Math.max(0, Math.min(LENGTH - 1, i))]?.focus()

  const setAt = (i: number, d: string) => {
    const next = digits.slice()
    next[i] = d
    onChange(next.join('').slice(0, LENGTH))
  }

  const onInput = (i: number, raw: string) => {
    const typed = raw.replace(/\D/g, '')
    if (!typed) return setAt(i, '')
    // Some keyboards autofill the whole code into one box.
    if (typed.length > 1) {
      const merged = (value.slice(0, i) + typed).slice(0, LENGTH)
      onChange(merged)
      return focus(merged.length)
    }
    setAt(i, typed)
    focus(i + 1)
  }

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i]) {
      e.preventDefault()
      setAt(i - 1, '')
      focus(i - 1)
    } else if (e.key === 'ArrowLeft') focus(i - 1)
    else if (e.key === 'ArrowRight') focus(i + 1)
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH)
    if (!pasted) return
    e.preventDefault()
    onChange(pasted)
    focus(pasted.length)
  }

  return (
    <div className="grid grid-cols-6 gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1} of ${LENGTH}`}
          maxLength={LENGTH}
          value={d}
          disabled={disabled}
          onChange={(e) => onInput(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
          className="min-h-14 w-full min-w-0 rounded-[10px] border border-field bg-white text-center font-display text-2xl font-bold outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-ground"
        />
      ))}
    </div>
  )
}
