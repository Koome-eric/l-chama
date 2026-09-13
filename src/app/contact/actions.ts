'use server';

import { z } from 'zod';
import { Resend } from 'resend';

/* ────────────────────────────────────────────────────────────── */
/*  Public contact form — no sign-in required. Mirrors the graceful  */
/*  degradation pattern already used for invite emails in            */
/*  src/app/(dashboard)/panel/actions.ts: if RESEND_API_KEY isn't     */
/*  configured, the caller is told plainly rather than shown a fake   */
/*  success message.                                                  */
/* ────────────────────────────────────────────────────────────── */

const resend = new Resend(process.env.RESEND_API_KEY);
const CONTACT_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'L-CHAMA <noreply@ludevaplc.co.ke>';
const CONTACT_TO_ADDRESS = 'lchama@ludevaplc.co.ke';

const ContactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.'),
  email: z.string().trim().email('Enter a valid email address.'),
  phone: z.string().trim().optional(),
  message: z.string().trim().min(10, 'Tell us a bit more (at least 10 characters).').max(2000),
});

export type ContactInput = z.infer<typeof ContactSchema>;

export async function sendContactMessage(input: ContactInput) {
  const parsed = ContactSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || 'Please check the form and try again.');
  }
  const d = parsed.data;

  if (!process.env.RESEND_API_KEY) {
    throw new Error('Message sending is not configured on this server yet. Please email lchama@ludevaplc.co.ke directly.');
  }

  try {
    await resend.emails.send({
      from: CONTACT_FROM_ADDRESS,
      to: [CONTACT_TO_ADDRESS],
      replyTo: d.email,
      subject: `New contact form message from ${d.name}`,
      html: `
        <h2>New message from the L-Chama contact page</h2>
        <p><strong>Name:</strong> ${d.name}</p>
        <p><strong>Email:</strong> ${d.email}</p>
        ${d.phone ? `<p><strong>Phone:</strong> ${d.phone}</p>` : ''}
        <p><strong>Message:</strong></p>
        <p style="white-space:pre-line;">${d.message}</p>
      `,
    });
  } catch (err: any) {
    console.error('❌ Failed to send contact message:', err);
    throw new Error('Could not send your message right now. Please email lchama@ludevaplc.co.ke directly.');
  }

  return { success: true as const };
}
