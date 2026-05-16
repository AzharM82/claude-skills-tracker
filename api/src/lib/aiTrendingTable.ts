import { TableClient, TableEntity, RestError } from "@azure/data-tables";

export const AI_TRENDING_TABLE = "AITrending";
export const AI_TRENDING_PARTITION = "trending";

let client: TableClient | null = null;

function getConnectionString(): string {
  const cs = process.env.TABLE_STORAGE_CONNECTION_STRING;
  if (!cs) throw new Error("TABLE_STORAGE_CONNECTION_STRING is not configured");
  return cs;
}

export function getAITrendingClient(): TableClient {
  if (!client) {
    client = TableClient.fromConnectionString(getConnectionString(), AI_TRENDING_TABLE);
  }
  return client;
}

export async function ensureAITrendingTable(): Promise<void> {
  try {
    await getAITrendingClient().createTable();
  } catch (err) {
    if (err instanceof RestError && err.statusCode === 409) return;
    throw err;
  }
}

export interface AITrendingEntity extends TableEntity {
  fullName: string;
  htmlUrl: string;
  description: string;
  author: string;
  stars: number;
  topics: string;
  language: string;
  license: string;
  createdAt: string;
  pushedAt: string;
  discoveredAt: string;
  lastScanAt: string;
  currentRank: number;
  previousRank: number;
  sourceTopic: string;
}

export async function listAllAITrending(): Promise<AITrendingEntity[]> {
  const out: AITrendingEntity[] = [];
  for await (const entity of getAITrendingClient().listEntities<AITrendingEntity>()) {
    out.push(entity);
  }
  return out;
}

export async function upsertAITrending(entity: AITrendingEntity): Promise<void> {
  await getAITrendingClient().upsertEntity(entity, "Replace");
}

export async function deleteAITrending(rowKey: string): Promise<void> {
  try {
    await getAITrendingClient().deleteEntity(AI_TRENDING_PARTITION, rowKey);
  } catch (err) {
    if (err instanceof RestError && err.statusCode === 404) return;
    throw err;
  }
}

export function repoToRowKey(fullName: string): string {
  return fullName.replace(/\//g, "__").replace(/[^a-zA-Z0-9_-]/g, "-");
}
