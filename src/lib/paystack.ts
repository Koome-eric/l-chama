import crypto from 'crypto';

/** Normalizes 07XX/01XX/+254.../254... to the 2547XXXXXXXX form Paystack expects. */
export function toPaystackPhone(localPhone: string): string {
  const digits = localPhone.replace(/\s+/g, '');
  if (digits.startsWith('+254')) return digits.slice(1);
  if (digits.startsWith('254')) return digits;
  if (digits.startsWith('0')) return `254${digits.slice(1)}`;
  return digits;
}


/* ────────────────────────────────────────────────────────────── */
/*                          PAYSTACK CLIENT                        */
/*                                                                   */
/*  Thin wrapper around the Paystack REST API. Only one env var is  */
/*  required to use it: PAYSTACK_SECRET_KEY (see .env.example).     */
/*                                                                   */
/*  Flow used in this app:                                          */
/*   - Visa card  -> initializeCardTransaction() returns a hosted   */
/*     checkout URL to redirect the payer to (Paystack Standard).   */
/*   - M-Pesa     -> chargeMpesa() triggers an STK push straight to */
/*     the payer's phone, no redirect (Paystack Charge API).        */
/*  Both resolve asynchronously via the webhook at                  */
/*  /api/payments/paystack/webhook (charge.success / charge.failed) */
/*  — see src/lib/payment-resolution.ts for what happens next.      */
/* ────────────────────────────────────────────────────────────── */

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error(
      'PAYSTACK_SECRET_KEY is not set. Add it to .env — see .env.example for where to get it from the Paystack dashboard.'
    );
  }
  return key;
}

async function paystackRequest<T = unknown>(
  path: string,
  options: { method?: 'GET' | 'POST'; body?: Record<string, unknown> } = {}
): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  const json = await res.json().catch(() => null);

  if (!res.ok || !json || json.status === false) {
    const message = json?.message || `Paystack request to ${path} failed (HTTP ${res.status}).`;
    throw new Error(message);
  }

  return json.data as T;
}

export interface PaystackInitializeResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

/** Card payments: hosted Paystack checkout. Returns a URL to redirect the payer to. */
export async function initializeCardTransaction(input: {
  email: string;
  amountKes: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitializeResult> {
  return paystackRequest<PaystackInitializeResult>('/transaction/initialize', {
    method: 'POST',
    body: {
      email: input.email,
      amount: Math.round(input.amountKes * 100), // KES -> subunit (cents)
      currency: 'KES',
      reference: input.reference,
      callback_url: input.callbackUrl,
      channels: ['card'],
      metadata: input.metadata ?? {},
    },
  });
}

export interface PaystackChargeResult {
  status: string; // 'success' | 'pay_offline' | 'send_otp' | 'failed' | ...
  reference: string;
  display_text?: string;
}

/** M-Pesa: triggers an STK push directly to the payer's phone. No redirect. */
export async function chargeMpesa(input: {
  email: string;
  amountKes: number;
  /** Local Kenyan format, e.g. 2547XXXXXXXX */
  phone: string;
  reference: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackChargeResult> {
  return paystackRequest<PaystackChargeResult>('/charge', {
    method: 'POST',
    body: {
      email: input.email,
      amount: Math.round(input.amountKes * 100),
      currency: 'KES',
      reference: input.reference,
      mobile_money: {
        phone: input.phone,
        provider: 'mpesa',
      },
      metadata: input.metadata ?? {},
    },
  });
}

export interface PaystackVerifyResult {
  status: 'success' | 'failed' | 'abandoned' | string;
  reference: string;
  amount: number; // subunit
  currency: string;
  gateway_response: string;
  channel: string;
  paid_at: string | null;
  metadata?: Record<string, unknown>;
}

/** Server-to-server check of a transaction's real status — always trust this over a webhook payload's own fields. */
export async function verifyTransaction(reference: string): Promise<PaystackVerifyResult> {
  return paystackRequest<PaystackVerifyResult>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/**
 * Verifies the `x-paystack-signature` header on an incoming webhook
 * request. `rawBody` must be the exact, unparsed request body text —
 * signature verification fails if the JSON is re-serialized first.
 */
export function isValidPaystackSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const expected = crypto.createHmac('sha512', getSecretKey()).update(rawBody).digest('hex');
  // Constant-time comparison to avoid leaking the signature via timing.
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signatureHeader, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/* ────────────────────────────────────────────────────────────── */
/*                              TRANSFERS                           */
/*                                                                   */
/*  Used for withdrawal payouts (see src/lib/withdrawals.ts) — sends */
/*  money OUT of the Paystack balance to a member's M-Pesa number.   */
/*  Requires: Transfers enabled on the Paystack account, and enough  */
/*  balance there (topped up from the fees/float Paystack settles to */
/*  you). If the dashboard has "OTP for transfers" turned on, a      */
/*  transfer needs a second finalize step with the OTP sent to the   */
/*  account owner — this app assumes that's turned OFF for           */
/*  server-only automated payouts; otherwise handle it manually from */
/*  the Paystack dashboard for that transfer, then mark the          */
/*  WithdrawalRequest PAID from /admin.                              */
/* ────────────────────────────────────────────────────────────── */

export interface PaystackTransferRecipient {
  recipient_code: string;
}

/** Registers (or re-registers) an M-Pesa number as a transfer recipient. */
export async function createMobileMoneyRecipient(input: {
  name: string;
  /** Local Kenyan format, e.g. 2547XXXXXXXX */
  phone: string;
}): Promise<PaystackTransferRecipient> {
  return paystackRequest<PaystackTransferRecipient>('/transferrecipient', {
    method: 'POST',
    body: {
      type: 'mobile_money',
      name: input.name,
      account_number: input.phone,
      bank_code: 'MPESA',
      currency: 'KES',
    },
  });
}

export interface PaystackTransferResult {
  transfer_code: string;
  reference: string;
  status: string; // 'success' | 'pending' | 'otp' | 'failed' | ...
}

/** Sends money out of the Paystack balance to a previously-registered recipient. */
export async function initiateTransfer(input: {
  amountKes: number;
  recipientCode: string;
  reason: string;
  reference: string;
}): Promise<PaystackTransferResult> {
  return paystackRequest<PaystackTransferResult>('/transfer', {
    method: 'POST',
    body: {
      source: 'balance',
      amount: Math.round(input.amountKes * 100),
      recipient: input.recipientCode,
      reason: input.reason,
      reference: input.reference,
    },
  });
}
