import { Action, ActionPanel, Icon, List } from "@raycast/api";
import React, { useEffect, useMemo, useState } from "react";
import { DockerTag, fetchTagsIncrementally } from "./dockerHubApi";
import { fuzzyFilter } from "./fuzzyFilter";
import {getCachedTags, setCachedTags} from "./cacheManager";

export default function TagList({ imageName }: { imageName: string }) {
  const [tags, setTags] = useState<DockerTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTags, setLoadingTags] = useState(false);
  const [error, setError] = useState<Error>();
  const [query, setQuery] = useState("");

  // In TagList.tsx, update the useEffect
  useEffect(() => {
    if (loadingTags) {
      return;
    }

    setLoading(true);
    setLoadingTags(true);

    const fetchTags = async () => {
      try {
        // Check cache first
        const cached = getCachedTags(imageName);
        if (cached) {
          setTags(cached);
          setLoading(false);
          setLoadingTags(false);
          return;
        }

        const allTags: DockerTag[] = [];
        for await (const newTags of fetchTagsIncrementally(imageName)) {
          allTags.push(...newTags);
          setTags((prevTags) => {
            const seenTags = new Set<number>(prevTags.map((t) => t.id));
            const uniqueNewTags = newTags.filter((t) => !seenTags.has(t.id));
            return [...prevTags, ...uniqueNewTags];
          });
        }
        // Cache the complete set of tags
        setCachedTags(imageName, allTags);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
        setLoadingTags(false);
      }
    };

    fetchTags();
  }, [imageName]);

  const filtered = useMemo(
    () => fuzzyFilter(query, tags, (t) => `${t.name} ${t.architectures.join(" ")}`),
    [query, tags]
  );

  const [namespace, repository] = imageName.includes("/")
      ? imageName.split("/", 2)
      : ["library", imageName];

  return (
    <List
      isLoading={loading}
      filtering={false} // disable Raycast built‑in filter
      navigationTitle={`Tags for ${imageName}`}
      searchBarPlaceholder="Type to fuzzy‑find a tag…"
      onSearchTextChange={setQuery} // keep query in state
    >
      {filtered.map((tag) => (
        <List.Item
          key={`${tag.id}`} // Ensure unique key
          title={tag.name}
          subtitle={tag.architectures.join(", ") + (tag.date && ", updated " + tag.date)}
          keywords={tag.architectures}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={`${imageName}:${tag.name}`} title="Copy Image:tag" />
              <Action.OpenInBrowser
                  title="Open in Docker Hub"
                  url={`https://hub.docker.com/layers/${namespace}/${repository}/${tag.name}/images/${tag.digest}`}
              />
            </ActionPanel>
          }
        />
      ))}

      {!loading && filtered.length === 0 && (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Nothing matches that search" />
      )}
      {error && <List.EmptyView icon={Icon.ExclamationMark} title="Failed to load tags" description={String(error)} />}
    </List>
  );
}
