import { chmodSync, constants, copyFileSync, lstatSync, mkdtempSync, readdirSync, renameSync, rmSync, utimesSync } from "node:fs";
import { join } from "node:path";

export const PROVIDER_PACK_FILE_LAYOUT = "independent-regular-files-v1";

/** Only call on the unpublished build tree, never on a retained provider cache. */
export function materializeIndependentProviderPackFiles(root) {
  const visit = directory => {
    for (const name of readdirSync(directory)) {
      const file = join(directory, name);
      const stat = lstatSync(file);
      if (stat.isDirectory()) visit(file);
      else if (stat.isSymbolicLink()) continue;
      else if (!stat.isFile()) throw new Error("Unsupported provider pack file layout entry");
      else if (stat.nlink > 1) {
        // Copy to a new inode before changing metadata: the source may also be
        // linked into pnpm's store outside this unpublished tree.
        const temporary = mkdtempSync(join(directory, ".paperclip-independent-"));
        try {
          const replacement = join(temporary, "file");
          copyFileSync(file, replacement, constants.COPYFILE_EXCL);
          chmodSync(replacement, stat.mode & 0o7777);
          utimesSync(replacement, stat.atimeMs / 1000, stat.mtimeMs / 1000);
          renameSync(replacement, file);
        } finally {
          rmSync(temporary, { recursive: true, force: true });
        }
      }
    }
  };
  if (!lstatSync(root).isDirectory()) throw new Error("Invalid provider pack build root");
  visit(root);
  const verify = directory => {
    for (const name of readdirSync(directory)) {
      const file = join(directory, name);
      const stat = lstatSync(file);
      if (stat.isDirectory()) verify(file);
      else if (stat.isFile() && stat.nlink !== 1) throw new Error("Provider pack files are not independent");
      else if (!stat.isFile() && !stat.isSymbolicLink()) throw new Error("Unsupported provider pack file layout entry");
    }
  };
  verify(root);
}
