/**
 * ======================================================================
 * Blakely Cinematics — Stripe Checkout + Booking Upsert (AWS Lambda)
 * ======================================================================
 * Runtime: Node.js 20.x (CommonJS)
 *
 * TABLE OF CONTENTS
 * A. Config & Imports
 * B. Helpers (CORS, responses, parsing)
 * C. Validation
 * D. DynamoDB booking upsert (PENDING_PAYMENT)
 * E. Stripe Checkout session creation
 * F. Handler (OPTIONS, POST)
 * G. Exports
 * ======================================================================
 */

/* =========================
 * A. Config & Imports
 * ========================= */
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const AWS = require('aws-sdk'); // v2 is bundled in Lambda
const ddb = new AWS.DynamoDB.DocumentClient({ convertEmptyValues: true });

const CONFIG = {
  SUCCESS_URL: process.env.SUCCESS_URL,
  CANCEL_URL: process.env.CANCEL_URL,
  DEPOSIT_AMOUNT: parseInt(process.env.DEPOSIT_AMOUNT || '17500', 10),
  BOOKINGS_TABLE: process.env.BOOKINGS_TABLE,
  CORS_ALLOW_ORIGIN: process.env.CORS_ALLOW_ORIGIN || '*',
};

/* =========================
 * B. Helpers (CORS, responses, parsing)
 * ========================= */
const baseHeaders = {
  'Access-Control-Allow-Origin': CONFIG.CORS_ALLOW_ORIGIN,
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
  'Access-Control-Allow-Methods': 'OPTIONS,POST',
  'Content-Type': 'application/json',
};

function ok(body) {
  return { statusCode: 200, headers: baseHeaders, body: JSON.stringify(body) };
}
function badRequest(msg, details) {
  return {
    statusCode: 400,
    headers: baseHeaders,
    body: JSON.stringify({ error: msg, details }),
  };
}
function fail(err, code = 500) {
  return {
    statusCode: code,
    headers: baseHeaders,
    body: JSON.stringify({ error: 'checkout_error', message: err?.message || String(err) }),
  };
}

function parseBody(event) {
  if (!event) return {};
  if (!event.body) return {};
  try {
    return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch (e) {
    throw new Error('Invalid JSON body');
  }
}

function nowMs() {
  return Date.now();
}

function genBookingId() {
  // Simple sortable id: BK-<YYYYMMDD>-<ms>
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `BK-${y}${m}${day}-${nowMs()}`;
}

function resolveSuccessUrl(preferredUrl) {
  const base = (preferredUrl && String(preferredUrl).trim()) || CONFIG.SUCCESS_URL;
  if (!base) {
    throw new Error('SUCCESS_URL is not configured');
  }

  if (base.includes('{CHECKOUT_SESSION_ID}')) {
    return base;
  }

  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}session_id={CHECKOUT_SESSION_ID}`;
}

/* =========================
 * C. Validation
 * ========================= */
function validateInput(input) {
  // accepted fields:
  // email (required), name (optional), packageType (optional), amountCents (optional),
  // bookingId (optional), metadata (optional object)
  const errors = [];
  const out = {};

  if (!input || typeof input !== 'object') {
    errors.push('Body must be a JSON object');
  }

  const email = input?.email && String(input.email).trim();
  if (!email) errors.push('email is required');
  out.email = email;

  out.name = (input?.name && String(input.name).trim()) || '';
  out.packageType = (input?.packageType && String(input.packageType).trim()) || 'deposit';
  out.bookingId = (input?.bookingId && String(input.bookingId).trim()) || genBookingId();

  // allow overriding amount for future products; default to DEPOSIT_AMOUNT
  const amount =
    input?.amountCents != null
      ? parseInt(String(input.amountCents), 10)
      : CONFIG.DEPOSIT_AMOUNT;
  if (!Number.isFinite(amount) || amount <= 0) errors.push('amountCents must be a positive integer (cents)');
  out.amountCents = amount;

  // pass-through metadata (only simple scalars/strings)
  const mdIn = input?.metadata && typeof input.metadata === 'object' ? input.metadata : {};
  const metadata = {};
  for (const [k, v] of Object.entries(mdIn)) {
    if (v == null) continue;
    metadata[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  out.metadata = metadata;

  const successUrl = input?.successUrl && String(input.successUrl).trim();
  if (successUrl) {
    out.successUrl = successUrl;
  }

  const cancelUrl = input?.cancelUrl && String(input.cancelUrl).trim();
  if (cancelUrl) {
    out.cancelUrl = cancelUrl;
  }

  return { errors, out };
}

/* =========================
 * D. DynamoDB booking upsert (PENDING_PAYMENT)
 * ========================= */
async function upsertPendingBooking({
  bookingId,
  email,
  name,
  packageType,
  amountCents,
  stripeSessionId,
}) {
  if (!CONFIG.BOOKINGS_TABLE) {
    console.warn('[WARN] BOOKINGS_TABLE is not set — skipping booking upsert.');
    return { skipped: true };
  }

  const now = nowMs();
  const item = {
    bookingId,                    // PK
    email,
    name,
    packageType,
    amountCents,
    currency: 'USD',
    status: 'PENDING_PAYMENT',
    stripeSessionId,
    createdAt: now,
    updatedAt: now,
  };

  const params = {
    TableName: CONFIG.BOOKINGS_TABLE,
    Item: item,
  };

  try {
    await ddb.put(params).promise();
    console.log('[INFO] Booking upserted (PENDING_PAYMENT)', { bookingId, stripeSessionId });
    return { ok: true, bookingId };
  } catch (err) {
    // Do not block checkout on write issues; return URL anyway.
    console.warn('[WARN] Booking upsert failed (non-fatal):', err?.message || err);
    return { ok: false, error: err?.message || String(err) };
  }
}

/* =========================
 * E. Stripe Checkout session creation
 * ========================= */
async function createCheckoutSession({
  email,
  name,
  packageType,
  amountCents,
  bookingId,
  metadata,
  successUrl,
  cancelUrl,
}) {
  const resolvedSuccessUrl = resolveSuccessUrl(successUrl);
  const resolvedCancelUrl =
    (cancelUrl && String(cancelUrl).trim()) || CONFIG.CANCEL_URL || resolvedSuccessUrl;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    success_url: resolvedSuccessUrl,
    cancel_url: resolvedCancelUrl,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: {
            name: 'Deposit',
            description: 'Photography Session Deposit',
            metadata: {
              service: 'photography_session',
              packageType,
              customerName: name,
              bookingId,
              ...metadata,
            },
          },
        },
        quantity: 1,
      },
    ],
    customer_email: email, // helps prefill
    client_reference_id: `${bookingId}`,
    metadata: {
      bookingId,
      packageType,
      amountCents: String(amountCents),
      email,
      name,
    },
  });

  return session;
}

/* =========================
 * F. Handler (OPTIONS, POST)
 * ========================= */
async function handler(event) {
  try {
    // Preflight
    if (event?.requestContext?.http?.method === 'OPTIONS' || event?.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers: baseHeaders, body: JSON.stringify({ ok: true }) };
    }

    // Only POST is allowed
    const method = event?.requestContext?.http?.method || event?.httpMethod;
    if (method !== 'POST') {
      return badRequest('Method Not Allowed', { method });
    }

    const body = parseBody(event);
    const { errors, out } = validateInput(body);
    if (errors.length) return badRequest('Invalid input', errors);

    const { email, name, packageType, amountCents, bookingId, metadata, successUrl, cancelUrl } = out;

    // Create Stripe session
    const session = await createCheckoutSession({
      email,
      name,
      packageType,
      amountCents,
      bookingId,
      metadata,
      successUrl,
      cancelUrl,
    });

    // Best-effort: upsert booking as PENDING_PAYMENT
    const upsertResult = await upsertPendingBooking({
      bookingId,
      email,
      name,
      packageType,
      amountCents,
      stripeSessionId: session.id,
    });

    return ok({
      url: session.url,
      sessionId: session.id,
      bookingId,
      bookingUpsert: upsertResult,
    });
  } catch (err) {
    console.error('[ERROR] Checkout failure:', err);
    // Map common errors to clearer messages
    if (String(err?.message || '').includes('Invalid JSON body')) {
      return badRequest('Invalid JSON body');
    }
    if (err?.type === 'StripeCardError' || err?.raw) {
      // surface minimal stripe error info without leaking internals
      return fail(new Error('Stripe error creating session'), 502);
    }
    return fail(err, 500);
  }
}

/* =========================
 * G. Exports
 * ========================= */
exports.handler = handler;
