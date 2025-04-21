import { List, ActionPanel, Action, Icon } from "@raycast/api";
import React from "react";
import { useEffect, useState, useMemo } from "react";
import { fetchTags, DockerTag } from "./dockerHubApi";
import { fuzzyFilter } from "./fuzzyFilter";

export default function TagList({ imageName }: { imageName: string }) {
  const [tags, setTags] = useState<DockerTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchTags(imageName)
        .then((t) => setTags(t))
        .catch(setError)
        .finally(() => setLoading(false));
  }, [imageName]);

  /* 🔍 actual fuzzy filtering happens here, UI never knows */
  const filtered = useMemo(() => fuzzyFilter(query, tags, (t) => `${t.name} ${t.architectures.join(" ")}`), [query, tags]);

  return (
      <List
          isLoading={loading}
          filtering={false}                     // disable Raycast built‑in filter
          navigationTitle={`Tags for ${imageName}`}
          searchBarPlaceholder="Type to fuzzy‑find a tag…"
          onSearchTextChange={setQuery}         // keep query in state
      >
        {filtered.map((tag) => (
            <List.Item
                key={tag.name}
                title={tag.name}
                subtitle={tag.architectures.join(", ")}
                keywords={tag.architectures}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard content={`${imageName}:${tag.name}`} title="Copy image:tag" />
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
