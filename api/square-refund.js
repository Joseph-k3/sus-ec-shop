// Square返金APIエンドポイント（Vercel Serverless Function）
import { Client, Environment } from 'square'

const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'sandbox'
const IS_SANDBOX = SQUARE_ENVIRONMENT === 'sandbox'

const SQUARE_ACCESS_TOKEN = IS_SANDBOX
  ? process.env.SQUARE_SANDBOX_ACCESS_TOKEN || process.env.SQUARE_ACCESS_TOKEN
  : process.env.SQUARE_ACCESS_TOKEN

console.log(`Square Refund API - Environment: ${SQUARE_ENVIRONMENT}`)

/**
 * Square返金処理
 */
async function refundPayment(paymentId, amount, reason = '') {
  try {
    // Initialize Square client
    const client = new Client({
      accessToken: SQUARE_ACCESS_TOKEN,
      environment: IS_SANDBOX ? Environment.Sandbox : Environment.Production,
    })

    const idempotencyKey = `${paymentId}-${Date.now()}-${Math.random().toString(36).substring(7)}`

    // Create refund
    const { result, statusCode } = await client.refundsApi.refundPayment({
      idempotencyKey: idempotencyKey,
      paymentId: paymentId,
      amountMoney: {
        amount: BigInt(Math.round(amount * 100)), // Convert to cents
        currency: 'JPY'
      },
      reason: reason || '管理者による返金処理'
    })

    if (statusCode !== 200) {
      console.error('Square refund error:', result)
      throw new Error(result.errors?.[0]?.detail || 'Square返金APIエラー')
    }

    console.log('Refund created successfully:', result.refund)
    return result.refund
  } catch (error) {
    console.error('Refund payment error:', error)
    throw error
  }
}

/**
 * Vercel Serverless Function Handler
 * POST /api/square-refund
 * Body: { paymentId: string, amount: number, reason?: string }
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { paymentId, amount, reason } = req.body

    // Validate input
    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' })
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' })
    }

    console.log(`Processing refund for payment: ${paymentId}, amount: ${amount}`)

    // Process refund
    const refund = await refundPayment(paymentId, amount, reason)

    return res.status(200).json({
      success: true,
      refund: {
        id: refund.id,
        status: refund.status,
        amountMoney: refund.amountMoney,
        createdAt: refund.createdAt,
        updatedAt: refund.updatedAt
      },
      environment: SQUARE_ENVIRONMENT,
      isTest: IS_SANDBOX
    })

  } catch (error) {
    console.error('Refund handler error:', error)
    return res.status(500).json({
      error: error.message || 'Internal server error',
      environment: SQUARE_ENVIRONMENT,
      isTest: IS_SANDBOX
    })
  }
}

