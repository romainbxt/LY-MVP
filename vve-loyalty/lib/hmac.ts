import { createHmac, timingSafeEqual } from 'crypto'

function getSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET
  if (!secret) {
    throw new Error('UNSUBSCRIBE_SECRET env var is not set')
  }
  return secret
}

export function signToken(uniqueId: string): string {
  return createHmac('sha256', getSecret())
    .update(uniqueId)
    .digest('base64url')
    .slice(0, 32)
}

export function verifyToken(uniqueId: string, signature: string): boolean {
  if (!uniqueId || !signature) return false
  const expected = signToken(uniqueId)
  if (expected.length !== signature.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

export function buildUnsubscribeUrl(baseUrl: string, uniqueId: string): string {
  const sig = signToken(uniqueId)
  return `${baseUrl}/unsubscribe/${uniqueId}?sig=${sig}`
}
