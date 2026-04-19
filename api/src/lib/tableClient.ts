import { TableClient, TableEntity, RestError } from "@azure/data-tables";

export const SKILLS_TABLE = "Skills";
export const SKILLS_PARTITION = "skill";

let skillsClient: TableClient | null = null;

function getConnectionString(): string {
  const cs = process.env.TABLE_STORAGE_CONNECTION_STRING;
  if (!cs) throw new Error("TABLE_STORAGE_CONNECTION_STRING is not configured");
  return cs;
}

export function getSkillsClient(): TableClient {
  if (!skillsClient) {
    skillsClient = TableClient.fromConnectionString(getConnectionString(), SKILLS_TABLE);
  }
  return skillsClient;
}

export async function ensureTable(): Promise<void> {
  try {
    await getSkillsClient().createTable();
  } catch (err) {
    if (err instanceof RestError && err.statusCode === 409) return;
    throw err;
  }
}

export interface SkillEntity extends TableEntity {
  title: string;
  repoUrl: string;
  description: string;
  author: string;
  stars: number;
  topics: string;
  discoveredAt: string;
  lastSeenAt: string;
  sourceQuery: string;
  pushedAt: string;
}

export async function getSkill(rowKey: string): Promise<SkillEntity | null> {
  try {
    const entity = await getSkillsClient().getEntity<SkillEntity>(SKILLS_PARTITION, rowKey);
    return entity;
  } catch (err) {
    if (err instanceof RestError && err.statusCode === 404) return null;
    throw err;
  }
}

export async function upsertSkill(entity: SkillEntity): Promise<void> {
  await getSkillsClient().upsertEntity(entity, "Merge");
}

export async function listAllSkills(): Promise<SkillEntity[]> {
  const out: SkillEntity[] = [];
  for await (const entity of getSkillsClient().listEntities<SkillEntity>()) {
    out.push(entity);
  }
  return out;
}

export function repoToRowKey(fullName: string): string {
  return fullName.replace(/\//g, "__").replace(/[^a-zA-Z0-9_-]/g, "-");
}
