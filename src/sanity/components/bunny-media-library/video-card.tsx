import type { MediaCardProps } from "./media-card";
import { MediaCard } from "./media-card";
import type { BunnyVideo } from "./types";

type VideoCardProps = {
  readonly video: BunnyVideo;
  readonly onDeleted: () => Promise<void>;
  readonly onClick?: () => void;
  readonly selectionMode?: boolean;
};

export function VideoCard({
  video,
  onDeleted,
  onClick,
  selectionMode,
}: VideoCardProps) {
  const props: MediaCardProps = {
    kind: "video",
    video,
    onDeleted,
    onClick,
    selectionMode,
  };

  return <MediaCard {...props} />;
}
