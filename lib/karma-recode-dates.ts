// Karma Recode access: one year from purchase. Purchases before 1 June 2026
// count from 1 June 2026. Pure — used by the server and the admin form.

export const KARMA_RECODE_EARLIEST_START = "2026-06-01"

/** When access starts counting, as YYYY-MM-DD. */
export function karmaRecodeStart(purchasedOn: string | null): string {
  return purchasedOn && purchasedOn > KARMA_RECODE_EARLIEST_START ? purchasedOn : KARMA_RECODE_EARLIEST_START
}

/** End of the day, IST, one year after the start. */
export function karmaRecodeExpiry(purchasedOn: string | null): string {
  const [y, m, d] = karmaRecodeStart(purchasedOn).split("-").map(Number)
  return new Date(Date.UTC(y + 1, m - 1, d, 18, 29, 59)).toISOString()
}
