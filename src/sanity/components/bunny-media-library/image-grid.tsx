import { Grid, Text } from "@sanity/ui";
import { ImageCard } from "./image-card";
import type { BunnyStorageFile } from "./types";

type ImageGridProps = {
  readonly files: BunnyStorageFile[];
  readonly onDeleted: () => Promise<void>;
  readonly onSelect?: (imageUrl: string) => void;
  readonly selectionMode?: boolean;
};

export function ImageGrid({
  files,
  onDeleted,
  onSelect,
  selectionMode,
}: ImageGridProps) {
  if (files.length === 0) {
    return <Text muted>No images found.</Text>;
  }

  return (
    <Grid columns={[1, 2, 3, 4]} gap={3}>
      {files.map((file) => (
        <ImageCard
          file={file}
          key={file.Guid}
          onClick={onSelect ? () => onSelect(file.cdnUrl) : undefined}
          onDeleted={onDeleted}
          selectionMode={selectionMode}
        />
      ))}
    </Grid>
  );
}
