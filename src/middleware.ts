import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/admin(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/invite/(.*)",
  // Public fundraising links — anyone can view a campaign and give via
  // mobile money/card without an L Chama account (see /give/[id]).
  "/give/(.*)",
  // Privacy policy — linked from the landing page footer and sign-up;
  // should be readable without an account.
  "/privacy",
  // Contact page — same reasoning; anyone should be able to reach the
  // team without signing up first.
  "/contact",
  // Every API route validates its own caller (Clerk currentUser(),
  // x-sync-secret header, or a Paystack signature) rather than relying
  // on a Clerk session — several are called by things that don't have
  // one (Google Apps Script, Paystack's webhook), so they must not be
  // redirected to /sign-in here.
  "/api/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  if (!userId && !isPublicRoute(req)) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
