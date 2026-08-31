'use server';

import { z } from 'zod';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const ProfileSchema = z.object({
  firstName: z.string().min(1, 'Enter your first name.'),
  lastName: z.string().min(1, 'Enter your last name.'),
  idNumber: z.string().min(4, 'Enter a valid ID/passport number.'),
  email: z.string().email('Enter a valid email.').optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], { errorMap: () => ({ message: 'Select a gender.' }) }),
  country: z.string().min(1, 'Select a country.'),
  region: z.string().min(1, 'Enter your region/county.'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters.')
    .regex(/[0-9]/, 'Password must contain a number.')
    .regex(/[a-zA-Z]/, 'Password must contain a letter.'),
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

  // Set the account password. Since this user signed up via phone OTP,
  // they have no existing password, so this sets one for the first time
  // rather than changing an existing one.
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

  const existing = await prisma.user.findUnique({ where: { clerkId } });

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
      },
    });
  }

  revalidatePath('/onboarding/profile');
  return { success: true };
}
