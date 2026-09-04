'use server';

import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { notifyUser } from '@/lib/notifications';

async function getCurrentDbUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error('You must be signed in.');
  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) throw new Error('Complete onboarding first.');
  return user;
}

async function getOrCreateMemberAccount(userId: string, productId: string) {
  const product = await prisma.investmentProduct.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) throw new Error('This account type is not available right now.');

  const existing = await prisma.memberAccount.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (existing) return existing;

  return prisma.memberAccount.create({ data: { userId, productId } });
}

/* ────────────────────────────────────────────────────────────── */
/*                     M-PESA / VISA CARD PAYMENTS                 */
/*                                                                   */
/*  No gateway is wired up yet. Each of these creates a PENDING     */
/*  Payment row and, for now, an admin resolves it manually from    */
/*  /admin → Payments (credits the MemberAccount on SUCCESS). To    */
/*  go live:                                                        */
/*   - MPESA: call Safaricom's Daraja STK Push here with `phone`    */
/*     and `amount`, store the CheckoutRequestID as `reference`,    */
/*     and have Daraja's callback URL resolve the payment instead   */
/*     of an admin.                                                 */
/*   - VISA_CARD: create a hosted checkout session with your card   */
/*     processor (Stripe/Flutterwave/Pesapal), store its session/   */
/*     reference id, and redirect the member to it — then let the   */
/*     processor's webhook resolve the payment.                     */
/* ────────────────────────────────────────────────────────────── */

export async function initiateMpesaPayment(input: { productId: string; amount: number; phone: string }) {
  const user = await getCurrentDbUser();

  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('Enter a valid amount.');
  const phone = input.phone.trim();
  if (!/^(?:\+?254|0)7\d{8}$/.test(phone) && !/^(?:\+?254|0)1\d{8}$/.test(phone)) {
    throw new Error('Enter a valid Safaricom number, e.g. 07XX XXX XXX.');
  }

  const account = await getOrCreateMemberAccount(user.id, input.productId);

  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      memberAccountId: account.id,
      channel: 'MPESA',
      amount: input.amount,
      phone,
      status: 'PENDING',
    },
  });

  revalidatePath('/accounts');
  return {
    success: true,
    paymentId: payment.id,
    message: `We've logged a request to pay KES ${input.amount.toLocaleString()} via M-Pesa from ${phone}. Once M-Pesa is connected, you'll get a real STK push here — for now our team will confirm and credit your account.`,
  };
}

export async function initiateCardPayment(input: { productId: string; amount: number }) {
  const user = await getCurrentDbUser();

  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('Enter a valid amount.');

  const account = await getOrCreateMemberAccount(user.id, input.productId);

  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      memberAccountId: account.id,
      channel: 'VISA_CARD',
      amount: input.amount,
      status: 'PENDING',
    },
  });

  revalidatePath('/accounts');
  return {
    success: true,
    paymentId: payment.id,
    message: `We've logged a request to pay KES ${input.amount.toLocaleString()} by card. Once card payments are connected you'll be sent to a secure checkout — for now our team will confirm and credit your account.`,
  };
}

/* ────────────────────────────────────────────────────────────── */
/*                    LUDEVA JUNIOR ACCOUNT APPLICATION            */
/* ────────────────────────────────────────────────────────────── */

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

async function fileToBase64(file: File, label: string) {
  if (file.size === 0) throw new Error(`Upload ${label}.`);
  if (file.size > MAX_FILE_BYTES) throw new Error(`${label} must be smaller than 4MB.`);
  if (!ALLOWED_MIME.has(file.type)) throw new Error(`${label} must be a JPG, PNG, or PDF file.`);
  const buffer = Buffer.from(await file.arrayBuffer());
  return { fileName: file.name, mimeType: file.type, data: buffer.toString('base64') };
}

export async function submitJuniorApplication(formData: FormData) {
  const user = await getCurrentDbUser();

  const childFullName = String(formData.get('childFullName') || '').trim();
  const childDob = String(formData.get('childDateOfBirth') || '').trim();
  const guardianIdNumber = String(formData.get('guardianIdNumber') || '').trim();
  const guardianPhone = String(formData.get('guardianPhone') || '').trim();
  const guardianKraPin = String(formData.get('guardianKraPin') || '').trim();
  const birthCertFile = formData.get('birthCert') as File | null;
  const childPhotoFile = formData.get('childPhoto') as File | null;

  if (!childFullName) throw new Error("Enter the child's full name.");
  if (!guardianIdNumber) throw new Error('Enter your ID/passport number.');
  if (!guardianPhone) throw new Error('Enter your phone number.');
  if (!guardianKraPin) throw new Error('Enter your KRA PIN.');
  if (!birthCertFile) throw new Error("Upload the child's birth certificate.");
  if (!childPhotoFile) throw new Error("Upload the child's passport photo.");

  const birthCert = await fileToBase64(birthCertFile, "Child's birth certificate");
  const childPhoto = await fileToBase64(childPhotoFile, "Child's passport photo");

  const application = await prisma.juniorAccountApplication.create({
    data: {
      guardianId: user.id,
      childFullName,
      childDateOfBirth: childDob ? new Date(childDob) : undefined,
      guardianIdNumber,
      guardianPhone,
      guardianKraPin,
      birthCertFileName: birthCert.fileName,
      birthCertMimeType: birthCert.mimeType,
      birthCertData: birthCert.data,
      childPhotoFileName: childPhoto.fileName,
      childPhotoMimeType: childPhoto.mimeType,
      childPhotoData: childPhoto.data,
    },
  });

  revalidatePath('/accounts');
  return { success: true, applicationId: application.id };
}
