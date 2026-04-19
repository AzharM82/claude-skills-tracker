export interface Skill {
  id: string;
  title: string;
  repoUrl: string;
  description: string;
  author: string;
  stars: number;
  topics: string[];
  discoveredAt: string;
  lastSeenAt: string;
  pushedAt: string;
}

export interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
}

export async function fetchSkills(): Promise<Skill[]> {
  const res = await fetch("/api/skills", { headers: { Accept: "application/json" } });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error(`Failed to load skills: ${res.status}`);
  const data = (await res.json()) as { skills: Skill[] };
  return data.skills;
}

export async function fetchPrincipal(): Promise<ClientPrincipal | null> {
  try {
    const res = await fetch("/.auth/me");
    if (!res.ok) return null;
    const data = (await res.json()) as { clientPrincipal: ClientPrincipal | null };
    return data.clientPrincipal;
  } catch {
    return null;
  }
}
