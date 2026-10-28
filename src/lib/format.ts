export function formatUGX(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'Set price'
  return `UGX ${new Intl.NumberFormat('en-UG', { maximumFractionDigits: 0 }).format(value)}`
}

export function formatEATDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00+03:00`) : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-UG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Kampala' }).format(date)
}

export function whatsappHref(number: string | null | undefined, message: string): string | null {
  const digits = String(number ?? '').replace(/\D/g, '')
  if (digits.length < 9) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
