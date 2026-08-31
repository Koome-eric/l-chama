import { prisma } from "@/lib/prisma";

export async function notifyUser(
  userId: string,
  title: string,
  message: string,
  _type?: string
) {
  try {
    await prisma.notification.create({
      data: { userId, title, message },
    });
  } catch (err) {
    console.error("❌ Failed to write notification:", err);
  }
}
