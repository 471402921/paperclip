import { useContext } from "react";
import { QueryClient, QueryClientContext, useQuery } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { queryKeys } from "@/lib/queryKeys";

/** Keeps `useQuery` from throwing in renders without a QueryClientProvider; never fetches. */
let detachedClient: QueryClient | null = null;
function getDetachedClient(): QueryClient {
  detachedClient ??= new QueryClient();
  return detachedClient;
}

/** Owner for renders without a QueryClientProvider (isolated test and story mounts). */
export const DETACHED_DRAFT_OWNER = "detached";

/**
 * The account that owns drafts and pending sends kept in browser storage, so
 * another account in the same browser never sees or sends them. Undefined
 * until the session is known: callers neither restore nor resend until then.
 * Once known it stays known through a failed refetch (the query keeps its
 * data), so drafts keep being backed up during an outage.
 */
export function useDraftOwner(): string | undefined {
  const contextClient = useContext(QueryClientContext);
  const { data: session } = useQuery(
    {
      queryKey: queryKeys.auth.session,
      queryFn: () => authApi.getSession(),
      enabled: contextClient != null,
    },
    contextClient ?? getDetachedClient(),
  );
  if (!contextClient) return DETACHED_DRAFT_OWNER;
  if (session === undefined) return undefined;
  return session?.user?.id ?? session?.session?.userId ?? "signed-out";
}
