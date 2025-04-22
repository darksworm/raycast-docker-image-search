import { execFile } from "child_process";
import { promisify } from "util";

export interface DockerImage {
  name: string;
  description: string;
  stars: number;
}

const execFileAsync = promisify(execFile);

/** Fallback search using DockerHub HTTP API (official images only). */
async function apiSearch(query: string): Promise<DockerImage[]> {
  if (!query) return [];
  const url = `https://hub.docker.com/v2/search/repositories/?is_official=true&page_size=25&query=${encodeURIComponent(
    query
  )}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Hub search failed (${res.status})`);
  const data = (await res.json()) as {
    results: { repo_name: string; short_description?: string; star_count?: number }[];
  };

  return data.results.map((r) => ({
    name: r.repo_name.replace("library/", ""),
    description: r.short_description ?? "",
    stars: r.star_count ?? 0,
  }));
}

/** Preferred search via local `docker search`; falls back to HTTP API on ENOENT. */
export async function searchImages(query: string, officialOnly: boolean = true): Promise<DockerImage[]> {
  if (!query) return [];

  const args = ["search"];
  if (officialOnly) args.push("--filter", "is-official=true");
  args.push("--no-trunc", "--format", "{{.Name}}:::{{.StarCount}}:::{{.Description}}", query);

  try {
    const { stdout } = await execFileAsync("docker", args);
    return stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [name, stars, desc] = line.split(":::");
        return { name, description: desc?.trim() ?? "", stars: parseInt(stars, 10) || 0 };
      });
  } catch (err: unknown) {
    /* Missing docker binary or other exec error ⇒ use HTTP fallback */
    if ((err as { code?: string }).code === "ENOENT") {
      return apiSearch(query);
    }
    throw err; // real CLI error (network, login rate‑limit, etc.)
  }
}
