export const formatIdr = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)

export const maskEmail = (email: string) => {
  const [name, domain] = email.split('@')
  if (!name || !domain) return email
  return `${name.slice(0, 2)}***@${domain}`
}

export const maskPhone = (phone: string) => {
  if (phone.length < 5) return phone
  return `${phone.slice(0, 3)}${'*'.repeat(Math.max(4, phone.length - 5))}${phone.slice(-2)}`
}
