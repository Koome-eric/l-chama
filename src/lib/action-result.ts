// Next.js (production) replaces the message of ANY error thrown out of a
// server action with a generic "An error occurred in the Server Components
// render. The specific message is omitted in production builds..." text, so
// a plain `throw new Error('This invite has expired.')` reaches the browser
// as that useless generic message.
//
// Server actions that people use directly (invite, accept-invite, ...) wrap
// their body in toResult() so expected failures are RETURNED as
// { ok: false, error } and the client shows the real reason. Only errors we
// raised on purpose (plain Error, or one marked __friendly by
// friendlyAccountError) are echoed back; anything else (Prisma, network,
// ...) gets a generic message and the real error is logged on the server.
export type ActionResult<T> = ({ ok: true } & T) | { ok: false; error: string };

export async function toResult<T extends object>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (err: any) {
    console.error('❌ server action failed:', err);
    const ours = err instanceof Error && (err.constructor === Error || (err as any).__friendly);
    return {
      ok: false,
      error:
        ours && err.message
          ? err.message
          : 'Something went wrong on our side. Please try again, and contact support if it keeps happening.',
    };
  }
}
