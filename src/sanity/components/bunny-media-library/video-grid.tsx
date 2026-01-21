import { Grid, Text } from "@sanity/ui";
import type { BunnyVideo } from "./types";
import { VideoCard } from "./video-card";

type VideoGridProps = {
  readonly videos: BunnyVideo[];
  readonly onDeleted: () => Promise<void>;
  readonly onSelect?: (videoId: string) => void;
  readonly selectionMode?: boolean;
};

export function VideoGrid({
  videos,
  onDeleted,
  onSelect,
  selectionMode,
}: VideoGridProps) {
  if (videos.length === 0) {
    return <Text muted>No videos found.</Text>;
  }

  return (
    <Grid columns={[1, 2, 3, 4]} gap={3}>
      {videos.map((video) => (
        <VideoCard
          key={video.guid}
          onClick={onSelect ? () => onSelect(video.guid) : undefined}
          onDeleted={onDeleted}
          selectionMode={selectionMode}
          video={video}
        />
      ))}
    </Grid>
  );
}
