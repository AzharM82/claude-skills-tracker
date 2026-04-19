import { HttpRequest } from "@azure/functions";

export interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
}

export function getClientPrincipal(req: HttpRequest): ClientPrincipal | null {
  const header = req.headers.get("x-ms-client-principal");
  if (!header) return null;
  try {
    const decoded = Buffer.from(header, "base64").toString("utf-8");
    return JSON.parse(decoded) as ClientPrincipal;
  } catch {
    return null;
  }
}

export function requireAuthorizedUser(req: HttpRequest): ClientPrincipal {
  const principal = getClientPrincipal(req);
  if (!principal) throw new Error("Unauthorized");
  const allowed = (process.env.ADMIN_USER || process.env.ADMIN_EMAIL || "").toLowerCase();
  if (!allowed) throw new Error("Unauthorized");
  if (principal.userDetails.toLowerCase() !== allowed) throw new Error("Unauthorized");
  return principal;
}
