import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@lib/db'
import { wholesaleAccounts } from '@lib/db/schema/wholesale'
import { eq } from 'drizzle-orm'
import { verifyPersonaSignature } from '../../../lib/webhooks/persona-signature'
import { readRawBody } from '../../../lib/api/read-raw-body'

/**
 * Persona Webhook Handler
 * Listens for inquiry completion events to update Tribal ID verification status.
 * Signature check matches store main: HMAC over the raw body, secret from env,
 * unsigned or invalid requests rejected.
 */
export const config = { api: { bodyParser: false } }

const WEBHOOK_SECRET = process.env.PERSONA_WEBHOOK_SECRET

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  const rawBody = await readRawBody(req)

  // Constant-time HMAC check over `${t}.${rawBody}` with a 300s replay window.
  const check = verifyPersonaSignature({
    secret: WEBHOOK_SECRET,
    header: req.headers['persona-signature'],
    rawBody,
  })
  if (!check.ok) {
    const status = check.reason === 'missing_secret' ? 503 : 401
    return res.status(status).json({ success: false, error: 'Invalid or missing webhook signature' })
  }

  try {
    const payload = JSON.parse(rawBody.toString('utf8'))
    const { event, data } = payload

    // We only care about completed inquiries
    if (event !== 'inquiry.completed') {
      return res.status(200).json({ success: true, message: 'Event ignored' })
    }

    const { account_id, fields } = data || {}
    const tribalId = fields?.tribal_id
    const isVerified = data?.status === 'approved'

    if (!account_id) {
      throw new Error('Missing account_id in Persona payload')
    }

    // Update the wholesale account verification status in our mirror DB
    // We assume account_id from Persona maps to uid in wholesaleAccounts
    await db
      .update(wholesaleAccounts)
      .set({
        tribalId: tribalId || null,
        isVerified: isVerified,
        updatedAt: new Date(),
      })
      .where(eq(wholesaleAccounts.uid, account_id))

    return res.status(200).json({
      success: true,
      message: `Verification status updated for ${account_id}`,
    })
  } catch (error: any) {
    console.error('[Persona Webhook Error]:', error?.message)
    if (error instanceof SyntaxError) {
      return res.status(400).json({ success: false, error: 'Invalid JSON payload' })
    }
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    })
  }
}
