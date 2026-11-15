import type { NextApiRequest } from 'next'
import { parseCookieHeader } from './manual-review'

const PUBLIC_BUSINESS_ADMIN_EMAIL = 'ryan@displaycellpros.com'

/**
 * Admin allowlist: the public business inbox plus optional extra addresses
 * from TRIBAL_ADMIN_EMAILS (comma-separated, server-side) or
 * NEXT_PUBLIC_TRIBAL_ADMIN_EMAILS (client-visible; use only when required).
 */
export function getAdminAllowlist(): string[] {
  const extra = [
    ...(process.env.TRIBAL_ADMIN_EMAILS || '').split(','),
    ...(process.env.NEXT_PUBLIC_TRIBAL_ADMIN_EMAILS || '').split(','),
  ]
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return Array.from(new Set([PUBLIC_BUSINESS_ADMIN_EMAIL, ...extra]))
}

/** Live allowlist for existing imports. */
export const ADMIN_ALLOWLIST = getAdminAllowlist()

/**
 * Checks if a given email address is in the designated admin allowlist.
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false
  const cleanEmail = email.trim().toLowerCase()
  return getAdminAllowlist().includes(cleanEmail)
}

/**
 * Extracts and validates the authenticated admin email from a NextApiRequest.
 * Checks cookies, headers, and environment overrides.
 */
export function getAdminEmailFromRequest(req: NextApiRequest): string | null {
  // 1. Header overrides (e.g. x-admin-email from proxy/middleware or test environment)
  const headerEmail = req.headers['x-admin-email'] || req.headers['x-user-email']
  if (typeof headerEmail === 'string' && isAdminEmail(headerEmail)) {
    return headerEmail.trim().toLowerCase()
  }

  // 2. Cookie parsing (Auth0 or session cookie)
  const cookies = parseCookieHeader(req.headers.cookie)
  if (cookies.user_email && isAdminEmail(cookies.user_email)) {
    return cookies.user_email.trim().toLowerCase()
  }

  // 3. Fallback check for query email if provided
  const queryEmail = req.query.adminEmail
  if (typeof queryEmail === 'string' && isAdminEmail(queryEmail)) {
    return queryEmail.trim().toLowerCase()
  }

  return null
}

/**
 * Verifies whether the request is originated by an authorized admin user.
 */
export function isAdminSession(req: NextApiRequest): boolean {
  return getAdminEmailFromRequest(req) !== null
}
