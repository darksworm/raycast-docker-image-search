// Define the structure for Docker tag information
export interface DockerTag {
  name: string;
  architectures: string[];
}

/**
 * Fetch all tags for a given Docker image (repository) from Docker Hub.
 * @param repository The image repository name (e.g. "ubuntu").
 * @param namespace  The Docker Hub namespace (defaults to "library" for official images).
 * @returns List of DockerTag objects containing tag names and supported architectures.
 */
export async function fetchTags(repository: string, namespace: string = "library"): Promise<DockerTag[]> {
  const baseUrl = `https://hub.docker.com/v2/repositories/${namespace}/${repository}/tags`;
  const pageSize = 100;
  let page = 1;
  const tags: DockerTag[] = [];

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const url = `${baseUrl}?page=${page}&page_size=${pageSize}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch tags (status ${response.status})`);
      }
      const data = await response.json() as { next?: string; results: { name: string; images?: { architecture: string; variant?: string }[] }[] };
      // Process the results on this page
      for (const result of data.results) {
        const tagName: string = result.name;
        // Each result has an "images" array with objects containing architecture and variant
        const archList: string[] =
          result.images?.map((img: { architecture: string; variant?: string }) => {
            let arch = img.architecture;
            // Include variant for ARM architectures if present (e.g., arm with v7)
            if (img.variant) {
              arch += `/${img.variant}`;
            }
            return arch;
          }) || [];
        // Remove duplicates and sort architectures for consistency
        const uniqueArchs = Array.from(new Set(archList));
        uniqueArchs.sort();
        tags.push({ name: tagName, architectures: uniqueArchs });
      }
      // Check if there are more pages
      if (data.next) {
        page += 1;
      } else {
        break;
      }
    }

    // Sort tags alphabetically (numeric parts in order) for easier browsing
    tags.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    return tags;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(error.message || "Failed to fetch tags from Docker Hub");
    }
    throw new Error("Failed to fetch tags from Docker Hub");
  }
}
