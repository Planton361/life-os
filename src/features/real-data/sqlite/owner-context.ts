import "server-only";
import { uuid } from "./codecs";

declare const ownerBrand: unique symbol;
export type OwnerContext = Readonly<{ ownerId: string; [ownerBrand]: true }>;
const global = globalThis as typeof globalThis & { __lifeOsIssuedOwners?: WeakSet<object> };
const issued = global.__lifeOsIssuedOwners ??= new WeakSet<object>();

// Only the request authentication adapter may mint this opaque capability.
// Repositories validate its object identity, not a client-owned string/field.
export function issueOwnerContext(serverAuthenticatedOwnerId: string): OwnerContext {
  const context = Object.freeze({ ownerId: uuid(serverAuthenticatedOwnerId) }) as OwnerContext;
  issued.add(context);
  return context;
}

export function requireOwnerContext(context: OwnerContext | null | undefined): string {
  if (!context || !issued.has(context)) throw new Error("OWNER_CONTEXT_REQUIRED");
  return context.ownerId;
}
