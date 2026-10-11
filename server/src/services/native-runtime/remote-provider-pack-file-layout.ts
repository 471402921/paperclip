/** Also serialized into the remote verifier; keep this body self-contained. */
export function verifyProviderPackFileLayout(
  root: string | null,
  policy: unknown,
  fs: Pick<typeof import("node:fs"), "lstatSync" | "statSync" | "readdirSync">,
  path: Pick<typeof import("node:path"), "join">,
): void {
  if (policy === undefined) return; // Existing immutable packs retain their original contract.
  if (policy !== "independent-regular-files-v1") throw new Error("runner_remote_provider_artifact_incompatible: provider pack file layout is unsupported");
  if (root === null) return; // Bundled manifest identity has no controller-side asset tree.
  // The caller may select an approved preinstalled-image root alias. Only this
  // root follows that alias; interior directory symlinks remain untouched.
  if (!fs.statSync(root).isDirectory()) throw new Error("runner_remote_provider_artifact_incompatible: provider pack file layout root is invalid");
  const visit = (directory: string): void => {
    for (const name of fs.readdirSync(directory)) {
      const file = path.join(directory, name);
      const stat = fs.lstatSync(file);
      if (stat.isDirectory()) visit(file);
      else if (stat.isFile()) {
        if (stat.nlink !== 1) throw new Error("runner_remote_provider_artifact_incompatible: provider pack file layout requires independent regular files");
      } else if (!stat.isSymbolicLink()) throw new Error("runner_remote_provider_artifact_incompatible: provider pack file layout entry is unsupported");
    }
  };
  visit(root);
}
