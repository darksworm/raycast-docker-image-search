import React from "react";
import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { searchImages, DockerImage } from "./dockerCli";
import TagList from "./TagList";
import {getCachedImages, setCachedImages} from "./cacheManager";

export default function SearchDockerImagesCommand() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<DockerImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const pageSize = 25; // Maximum results per page

  useEffect(() => {
    if (searchText.length === 0) {
      setResults([]);
      setIsLoading(false);
      setErrorMessage(undefined);
      return;
    }
    setIsLoading(true);
    setErrorMessage(undefined);

    const debounceTimer = setTimeout(async () => {
      try {
        const query = searchText;

        const cached = getCachedImages(query);
        if (cached) {
          setResults(cached);
          setIsLoading(false);
          return;
        }

        const images = await searchImages(query, 25);
        if (query === searchText) {
          setResults(images);
          // Cache the results
          setCachedImages(query, images);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        setIsLoading(false);
        setResults([]);
        if (err instanceof Error) {
          setErrorMessage(err.message || "Error searching images");
        } else {
          setErrorMessage("Error searching images");
        }
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchText]);

  // Render the list of image results
  return (
    <List
      navigationTitle="Search Docker Hub Images"
      searchBarPlaceholder="Search official Docker images…"
      filtering={false} // we implement our own filtering via the search CLI
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
    >
      {results.map((image) => (
        <List.Item
          key={image.name}
          title={image.name}
          subtitle={image.description.length > 80 ? image.description.slice(0, 77) + "..." : image.description}
          accessories={[
              image.isOfficial ? { tooltip: "This is an official image", icon: Icon.CheckCircle } : {},
              { text: String(image.stars), icon: Icon.Star }
          ]}
          actions={
            <ActionPanel>
              {/* Push a new TagList view when an image is selected */}
              <Action.Push title="Show Tags" target={<TagList imageName={image.name} />} />
              <Action.OpenInBrowser
                  title="View on Docker Hub"
                  url={`https://hub.docker.com/${image.isOfficial ? '_/' : 'r/'}${image.name}`}
              />
            </ActionPanel>
          }
        />
      ))}

      {/* Indicate more results if the maximum page size is reached */}
      {results.length === pageSize && (
          <List.Item
              key="more-results"
              title="Refine your search query"
              subtitle="There might be more results. Try narrowing your search."
              icon={Icon.Info}
          />
      )}

      {/* Show a friendly message when no results or on initial state */}
      {results.length === 0 && !isLoading && searchText.length === 0 && (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Type to search Docker Hub official images" />
      )}
      {results.length === 0 && !isLoading && searchText.length > 0 && errorMessage && (
        <List.EmptyView icon={Icon.XmarkCircle} title="No images found" description={errorMessage} />
      )}
    </List>
  );
}
