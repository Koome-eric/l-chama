'use server';

import { z } from 'zod';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const UpdateProfileSchema = z.object({
  firstName: z.string().min(1, 'Enter your first name.'),
  lastName: z.string().min(1, 'Enter your last name.'),
  idNumber: z.string().min(4, 'Enter a valid ID/passport number.'),
  email: z.string().email('Enter a valid email.').optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], { errorMap: () => ({ message: 'Select a gender.' }) }),
  country: z.string().min(1, 'Select a country.'),
  region: z.string().min(1, 'Enter your region/county.'),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export async function updateProfile(input: UpdateProfileInput) {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('You must be signed in.');

  const parsed = UpdateProfileSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || 'Invalid data provided.');
  }
  const d = parsed.data;

  const existing = await prisma.user.findUnique({ where: { clerkId } });
  if (!existing) throw new Error('Profile not found.');

  const fullName = `${d.firstName.trim()} ${d.lastName.trim()}`.trim();

  // Keep Clerk's name in sync so it shows correctly in the account menu.
  try {
    const client = await clerkClient();
    await client.users.updateUser(clerkId, {
      firstName: d.firstName.trim(),
      lastName: d.lastName.trim(),
    });
  } catch {
    // Non-fatal — the DB update below is the source of truth for the app itself.
  }

  await prisma.user.update({
    where: { id: existing.id },
    data: {
      email: d.email?.trim() || existing.email,
      firstName: d.firstName.trim(),
      lastName: d.lastName.trim(),
      fullName,
      idNumber: d.idNumber.trim(),
      gender: d.gender,
      country: d.country,
      region: d.region.trim(),
    },
  });

  revalidatePath('/profile');
  return { success: true };
}
