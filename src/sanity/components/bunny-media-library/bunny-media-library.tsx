import {
  Box,
  Container,
  Stack,
  Tab,
  TabList,
  TabPanel,
  Text,
} from "@sanity/ui";
import { useState } from "react";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { ImageGrid } from "./image-grid";
import { ImageUploadForm } from "./image-upload-form";
import { LoadingState } from "./loading-state";
import { useBunnyMedia } from "./use-bunny-media";
import { VideoGrid } from "./video-grid";
import { VideoUploadForm } from "./video-upload-form";

type BunnyMediaLibraryProps = Readonly<{
  selectionMode?: boolean;
  onSelect?: (type: "image" | "video", value: string) => void;
  allowedTypes?: "image" | "video" | "both";
}>;

// biome-ignore lint: media library UI is clearer as a single component
function BunnyMediaLibrary({
  selectionMode = false,
  onSelect,
  allowedTypes = "both",
}: BunnyMediaLibraryProps) {
  const { videos, storageFiles, loading, error, refresh } = useBunnyMedia();

  // Determine initial tab and available tabs based on allowedTypes
  const canSelectVideos = allowedTypes === "video" || allowedTypes === "both";
  const canSelectImages = allowedTypes === "image" || allowedTypes === "both";
  const initialTab = canSelectVideos ? "videos" : "images";
  const [activeTab, setActiveTab] = useState<"videos" | "images">(initialTab);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  return (
    <Container width="auto">
      <Box padding={4}>
        <Stack space={4}>
          <Text size={2} weight="semibold">
            Media Library
          </Text>

          {(canSelectVideos || canSelectImages) && (
            <TabList space={2}>
              {canSelectVideos && (
                <Tab
                  aria-controls="videos-panel"
                  id="videos-tab"
                  label={`Videos (${videos.length})`}
                  onClick={() => setActiveTab("videos")}
                  selected={activeTab === "videos"}
                />
              )}
              {canSelectImages && (
                <Tab
                  aria-controls="images-panel"
                  id="images-tab"
                  label={`Images (${storageFiles.length})`}
                  onClick={() => setActiveTab("images")}
                  selected={activeTab === "images"}
                />
              )}
            </TabList>
          )}

          {canSelectVideos && (
            <TabPanel
              aria-labelledby="videos-tab"
              hidden={activeTab !== "videos"}
              id="videos-panel"
            >
              <Stack space={4}>
                {!selectionMode && <VideoUploadForm onUploaded={refresh} />}
                {videos.length === 0 ? (
                  <EmptyState />
                ) : (
                  <VideoGrid
                    onDeleted={refresh}
                    onSelect={
                      selectionMode && onSelect
                        ? (videoId) => onSelect("video", videoId)
                        : undefined
                    }
                    selectionMode={selectionMode}
                    videos={videos}
                  />
                )}
              </Stack>
            </TabPanel>
          )}

          {canSelectImages && (
            <TabPanel
              aria-labelledby="images-tab"
              hidden={activeTab !== "images"}
              id="images-panel"
            >
              <Stack space={4}>
                {!selectionMode && <ImageUploadForm onUploaded={refresh} />}
                {storageFiles.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ImageGrid
                    files={storageFiles}
                    onDeleted={refresh}
                    onSelect={
                      selectionMode && onSelect
                        ? (imageUrl) => onSelect("image", imageUrl)
                        : undefined
                    }
                    selectionMode={selectionMode}
                  />
                )}
              </Stack>
            </TabPanel>
          )}
        </Stack>
      </Box>
    </Container>
  );
}

export default BunnyMediaLibrary;
