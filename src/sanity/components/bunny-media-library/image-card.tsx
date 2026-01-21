import type { MediaCardProps } from "./media-card";
import { MediaCard } from "./media-card";
import type { BunnyStorageFile } from "./types";

type ImageCardProps = {
  readonly file: BunnyStorageFile;
  readonly onDeleted: () => Promise<void>;
  readonly onClick?: () => void;
  readonly selectionMode?: boolean;
};

export function ImageCard({
  file,
  onDeleted,
  onClick,
  selectionMode,
}: ImageCardProps) {
  const props: MediaCardProps = {
    kind: "image",
    file,
    onDeleted,
    onClick,
    selectionMode,
  };

  return <MediaCard {...props} />;
}
