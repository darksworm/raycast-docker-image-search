export interface DockerImage {
  name: string;
  description: string;
  stars: number;
  isOfficial: boolean; // New property to indicate if the image is official
}

export async function searchImages(query: string): Promise<DockerImage[]> {
  if (!query) return [];
  const url = `https://hub.docker.com/v2/search/repositories/?page_size=25&query=${encodeURIComponent(query)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Hub search failed (${res.status})`);
  const data = (await res.json()) as {
    results: { repo_name: string; short_description?: string; star_count?: number; is_official: boolean }[];
  };

  // Map results and sort by official status first, then by stars
  return data.results
    .map((r) => ({
      name: r.repo_name.replace("library/", ""),
      description: r.short_description ?? "",
      stars: r.star_count ?? 0,
      isOfficial: r.is_official,
    }))
    .sort((a, b) => {
      if (a.isOfficial === b.isOfficial) {
        return b.stars - a.stars; // Sort by stars if both are official/unofficial
      }
      return a.isOfficial ? -1 : 1; // Official images come first
    });
}
