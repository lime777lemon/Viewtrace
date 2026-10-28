import { PipedreamClient } from "@pipedream/sdk/server";

/** Existing Connect project. Production keeps accounts separate from development. */
export const PIPEDREAM_PROJECT_ID = "proj_RMslV4y";
export const PIPEDREAM_PROJECT_ENVIRONMENT = "production" as const;

export function pipedreamConfigured(): boolean {
  return Boolean(process.env.PIPEDREAM_CLIENT_ID?.trim() && process.env.PIPEDREAM_CLIENT_SECRET?.trim());
}

export function pipedreamServerClient(): PipedreamClient | null {
  const clientId = process.env.PIPEDREAM_CLIENT_ID?.trim();
  const clientSecret = process.env.PIPEDREAM_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  const projectId = process.env.PIPEDREAM_PROJECT_ID?.trim() || PIPEDREAM_PROJECT_ID;
  return new PipedreamClient({
    clientId,
    clientSecret,
    projectId,
    projectEnvironment: PIPEDREAM_PROJECT_ENVIRONMENT,
  });
}

export type ConnectedAccountView = {
  id: string;
  appName: string;
  healthy: boolean | null;
};

export async function listConnectedAccounts(externalUserId: string): Promise<ConnectedAccountView[]> {
  const client = pipedreamServerClient();
  if (!client) return [];
  const page = await client.accounts.list({ externalUserId, limit: 50 });
  return page.data.map((account) => ({
    id: account.id,
    appName: account.app?.name || account.name || account.id,
    healthy: typeof account.healthy === "boolean" ? account.healthy : null,
  }));
}
