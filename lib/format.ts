export function formatPrice(cents: number, locale = "fr-FR", currency = "EUR") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}
