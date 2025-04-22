// src/cacheManager.ts
import { Cache } from "@raycast/api";
import { DockerImage } from "./dockerCli";
import { DockerTag } from "./dockerHubApi";

const cache = new Cache();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const IMAGE_CACHE_PREFIX = "docker_images_";
const TAG_CACHE_PREFIX = "docker_tags_";

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

export function getCachedImages(query: string): DockerImage[] | null {
  const cached = cache.get(`${IMAGE_CACHE_PREFIX}${query}`);
  if (!cached) return null;

  console.log("IMAGES: CACHE HIT")

  const entry = JSON.parse(cached) as CacheEntry<DockerImage[]>;
  if (Date.now() - entry.timestamp > CACHE_DURATION) {
    cache.remove(`${IMAGE_CACHE_PREFIX}${query}`);
    console.log("IMAGES: CACHE CLEAR")
    return null;
  }
  return entry.data;
}

export function setCachedImages(query: string, images: DockerImage[]): void {
  const entry: CacheEntry<DockerImage[]> = {
    timestamp: Date.now(),
    data: images,
  };
  cache.set(`${IMAGE_CACHE_PREFIX}${query}`, JSON.stringify(entry));
}

export function getCachedTags(imageId: string): DockerTag[] | null {
  const cached = cache.get(`${TAG_CACHE_PREFIX}${imageId}`);
  if (!cached) return null;

  console.log("TAGS: CACHE HIT")

  const entry = JSON.parse(cached) as CacheEntry<DockerTag[]>;
  if (Date.now() - entry.timestamp > CACHE_DURATION) {
    cache.remove(`${TAG_CACHE_PREFIX}${imageId}`);
    console.log("TAGS: CACHE CLEAR")
    return null;
  }
  return entry.data;
}

export function setCachedTags(imageId: string, tags: DockerTag[]): void {
  const entry: CacheEntry<DockerTag[]> = {
    timestamp: Date.now(),
    data: tags,
  };
  cache.set(`${TAG_CACHE_PREFIX}${imageId}`, JSON.stringify(entry));
}
