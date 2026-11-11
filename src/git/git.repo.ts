/** `https://github.com/yog4a/duree` and `git@github.com:yog4a/duree.git` become `yog4a/duree`. */
export function repoSlug(remote: string): string | null {
  const trimmed = remote.trim();
  if (trimmed.length === 0) {
    return null;
  }
  let pathPart = trimmed;
  if (trimmed.includes("://")) {
    try {
      pathPart = new URL(trimmed).pathname;
    } catch {
      return null;
    }
  } else {
    const colon = trimmed.indexOf(":");
    if (colon >= 0) {
      pathPart = trimmed.slice(colon + 1);
    }
  }
  const parts = pathPart.replace(/\.git$/, "").split("/").filter((part) => part.length > 0);
  if (parts.length < 2) {
    return null;
  }
  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

export function projectName(root: string, remote: string | null): string {
  if (remote) {
    const slug = repoSlug(remote);
    if (slug) {
      return slug;
    }
  }
  return root;
}
