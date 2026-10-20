import { useQuery } from "@tanstack/react-query";
import { instanceSettingsApi } from "@/api/instanceSettings";
import { queryKeys } from "@/lib/queryKeys";

/** Notebook setup remains unavailable until the managed rollout is confirmed. */
export function usePaperclipNotebookEnabled() {
  const query = useQuery({
    queryKey: queryKeys.instance.experimentalSettings,
    queryFn: () => instanceSettingsApi.getExperimental(),
  });
  return { enabled: !query.isError && query.data?.enablePaperclipNotebook === true, loaded: query.isFetched, failed: query.isError };
}
