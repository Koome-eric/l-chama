'use server';

import { z } from 'zod';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const ProfileSchema = z
  .object({
    firstName: z.string().min(1, 'Enter your first name.'),
    lastName: z.string().min(1, 'Enter your last name.'),
    idNumber: z.string().min(4, 'Enter a valid ID/passport number.'),
    email: z.string().email('Enter a valid email.').optional().or(z.literal('')),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER'], { errorMap: () => ({ message: 'Select a gender.' }) }),
    country: z.string().min(1, 'Select a country.'),
    region: z.string().min(1, 'Enter your region/county.'),
    isExistingLudevaMember: z.boolean().optional(),
    ludevaMemberNumber: z.string().trim().optional(),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters.')
      .regex(/[0-9]/, 'Password must contain a number.')
      .regex(/[a-zA-Z]/, 'Password must contain a letter.'),
  })
  .refine((d) => !d.isExistingLudevaMember || (d.ludevaMemberNumber && d.ludevaMemberNumber.length >= 3), {
    message: 'Enter your Ludeva membership number.',
    path: ['ludevaMemberNumber'],
  });

export type ProfileInput = z.infer<typeof ProfileSchema>;

export async function completeProfile(input: ProfileInput) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('You must be signed in.');

  const parsed = ProfileSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || 'Invalid data provided.');
  }
  const d = parsed.data;

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(clerkId);

  const phone = clerkUser.phoneNumbers.find(
    (p) => p.id === clerkUser.primaryPhoneNumberId
  )?.phoneNumber || clerkUser.phoneNumbers[0]?.phoneNumber;

  const email =
    d.email?.trim() ||
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
    clerkUser.emailAddresses[0]?.emailAddress;

  // Set/confirm the account password from the profile step. Works
  // whether Clerk collected one already at sign-up or not — this simply
  // (re)sets it to what the person entered here.
  try {
    await client.users.updateUser(clerkId, {
      firstName: d.firstName.trim(),
      lastName: d.lastName.trim(),
      password: d.password,
    });
  } catch (err: any) {
    throw new Error(err?.errors?.[0]?.longMessage || 'Could not set your password. Try again.');
  }

  const fullName = `${d.firstName.trim()} ${d.lastName.trim()}`.trim();

  const ludevaFields = d.isExistingLudevaMember
    ? { ludevaMemberNumber: d.ludevaMemberNumber!.trim(), ludevaMembershipStatus: 'PENDING' as const }
    : {};

  const existing = await prisma.user.findUnique({ where: { clerkId } });

  // email and phone are unique on User — surface a clear message instead
  // of letting an unhandled Prisma error crash the render (which is all
  // Next.js shows in production: a generic "Server Components render"
  // box with no detail).
  try {
    if (!existing) {
      await prisma.user.create({
        data: {
          clerkId,
          email: email || undefined,
          phone: phone || undefined,
          firstName: d.firstName.trim(),
          lastName: d.lastName.trim(),
          fullName,
          idNumber: d.idNumber.trim(),
          gender: d.gender,
          country: d.country,
          region: d.region.trim(),
          profileCompleted: true,
          ...ludevaFields,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          email: email || existing.email,
          phone: phone || existing.phone,
          firstName: d.firstName.trim(),
          lastName: d.lastName.trim(),
          fullName,
          idNumber: d.idNumber.trim(),
          gender: d.gender,
          country: d.country,
          region: d.region.trim(),
          profileCompleted: true,
          ...ludevaFields,
        },
      });
    }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta?.target.join(', ') : String(err.meta?.target ?? '');
      if (target.includes('email')) {
        throw new Error('That email address is already registered to another account. Try signing in instead, or use a different email.');
      }
      if (target.includes('phone')) {
        throw new Error('That phone number is already registered to another account. Try signing in instead, or use a different number.');
      }
      throw new Error('Some of these details are already registered to another account.');
    }
    throw err;
  }

  revalidatePath('/onboarding/profile');
  return { success: true };
}
