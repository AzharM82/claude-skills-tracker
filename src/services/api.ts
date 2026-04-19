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

export interface SkillsMeta {
  tokenExpiresAt: string | null;
  lastScanAt: string | null;
}

export interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
}

export async function fetchSkills(): Promise<{ skills: Skill[]; meta: SkillsMeta }> {
  const res = await fetch("/api/skills", { headers: { Accept: "application/json" } });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error(`Failed to load skills: ${res.status}`);
  const data = (await res.json()) as { skills: Skill[]; meta?: SkillsMeta };
  return {
    skills: data.skills,
    meta: data.meta ?? { tokenExpiresAt: null, lastScanAt: null },
  };
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
