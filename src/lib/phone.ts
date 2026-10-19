// Ghana numbers only, as the 10-digit national number (0241234567).

// Keeps digits only, max 10. A pasted +233 / 233 number becomes its 0-prefixed form.
export const cleanPhoneInput = (value: string) => {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('233') && digits.length > 10) digits = '0' + digits.slice(3)
  return digits.slice(0, 10)
}

// 0241234567 -> "024 123 4567", shown while typing. Works on partial input too.
export const formatPhone = (digits: string) =>
  [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)].filter(Boolean).join(' ')

export const isGhanaPhone = (v: string) => /^0\d{9}$/.test(v)

// The server stores +233241234567; the form shows 0241234567.
export const toLocalPhone = (stored: string | null | undefined) =>
  stored?.startsWith('+233') ? '0' + stored.slice(4) : (stored ?? '')
