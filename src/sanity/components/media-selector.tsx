import { SearchIcon, UploadIcon } from "@sanity/icons";
import {
  Box,
  Button,
  Card,
  Dialog,
  Flex,
  Stack,
  Text,
  TextInput,
} from "@sanity/ui";
import { useState } from "react";
import type { ObjectInputProps } from "sanity";
import { set, unset } from "sanity";
import type { MediaSelectorOptions } from "@/sanity/schema-types/core/media-selector";
import BunnyMediaLibrary from "./bunny-media-library/bunny-media-library";

type MediaSelectorValue = {
  type?: "image" | "video";
  value?: string;
  altText?: string;
  description?: string;
};

function PreviewSection({
  currentType,
  thumbnailUrl,
  altText,
  description,
  onAltTextChange,
  onDescriptionChange,
}: Readonly<{
  currentType: "image" | "video";
  thumbnailUrl: string | null;
  altText: string;
  description: string;
  onAltTextChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}>) {
  return (
    <>
      {thumbnailUrl && (
        <Box
          style={{
            aspectRatio: "16/9",
            backgroundColor: "#1a1a1a",
            borderRadius: "4px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <img
            alt={currentType === "image" ? altText : "Video thumbnail"}
            height={180}
            src={thumbnailUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            width={320}
          />
        </Box>
      )}

      {currentType === "image" && (
        <Stack space={2}>
          <Text size={1} weight="semibold">
            Alt Text <span style={{ color: "red" }}>*</span>
          </Text>
          <TextInput
            onChange={(e) => onAltTextChange(e.currentTarget.value)}
            placeholder="Enter alternative text for this image"
            value={altText}
          />
          {!altText && (
            <Text muted size={0} style={{ color: "red" }}>
              Alt text is required for accessibility
            </Text>
          )}
        </Stack>
      )}

      {currentType === "video" && (
        <Stack space={2}>
          <Text muted size={1} weight="medium">
            Description <span style={{ color: "red" }}>*</span>
          </Text>
          <TextInput
            onChange={(e) => onDescriptionChange(e.currentTarget.value)}
            placeholder="Enter description for this video (required for visually impaired users)"
            value={description}
          />
          {!description && (
            <Text muted size={0} style={{ color: "red" }}>
              Description is required for accessibility
            </Text>
          )}
        </Stack>
      )}
    </>
  );
}

function MediaSelector(props: Readonly<ObjectInputProps<MediaSelectorValue>>) {
  const { value, onChange, schemaType } = props;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Get allowed types from schema options
  // Options can be set on the type definition or passed when defining the field
  // Field-level options are accessible through schemaType.options with type assertion
  const options =
    (schemaType.options as MediaSelectorOptions | undefined) || {};
  const allowedTypes = options.allowedTypes || "both";

  const currentType = value?.type;
  const currentValue = value?.value;
  const altText = value?.altText || "";
  const description = value?.description || "";

  // Get thumbnail URL for preview
  const getThumbnailUrl = (): string | null => {
    if (!currentValue) {
      return null;
    }

    if (currentType === "image") {
      return currentValue;
    }

    if (currentType === "video") {
      // For videos, construct thumbnail URL from CDN hostname and video ID
      let cdnHostname: string | undefined;
      try {
        cdnHostname = import.meta.env?.PUBLIC_BUNNY_CDN_HOSTNAME;
      } catch {
        cdnHostname = undefined;
      }
      if (cdnHostname) {
        return `https://${cdnHostname}/${currentValue}/thumbnail.jpg`;
      }
    }

    return null;
  };

  const thumbnailUrl = getThumbnailUrl();

  const handleSelect = (type: "image" | "video", selectedValue: string) => {
    onChange(
      set({
        type,
        value: selectedValue,
        altText: type === "image" ? altText : "",
        description: type === "video" ? description : "",
      })
    );
    setDialogOpen(false);
  };

  const handleClear = () => {
    onChange(unset());
  };

  const handleAltTextChange = (newAltText: string) => {
    onChange(
      set({
        ...value,
        altText: newAltText,
      })
    );
  };

  const handleDescriptionChange = (newDescription: string) => {
    onChange(
      set({
        ...value,
        description: newDescription,
      })
    );
  };

  return (
    <Stack space={4}>
      {currentValue && currentType && (
        <Card padding={3} radius={2} shadow={1}>
          <Stack space={3}>
            <Flex align="center" justify="space-between">
              <Text muted size={1} weight="medium">
                Selected: {currentType === "image" ? "Image" : "Video"}
              </Text>
              <Button
                fontSize={1}
                mode="ghost"
                onClick={handleClear}
                text="Clear"
                tone="critical"
              />
            </Flex>

            <PreviewSection
              altText={altText}
              currentType={currentType}
              description={description}
              onAltTextChange={handleAltTextChange}
              onDescriptionChange={handleDescriptionChange}
              thumbnailUrl={thumbnailUrl}
            />
          </Stack>
        </Card>
      )}

      {!currentValue && (
        <Flex gap={2}>
          <Button
            fontSize={1}
            icon={UploadIcon}
            mode="default"
            onClick={() => setUploadDialogOpen(true)}
            text="Upload"
            tone="primary"
          />
          <Button
            fontSize={1}
            icon={SearchIcon}
            mode="default"
            onClick={() => setDialogOpen(true)}
            text="Select"
            tone="neutral"
          />
        </Flex>
      )}

      {dialogOpen && (
        <Dialog
          header="Select Media"
          id="media-selector-dialog"
          onClose={() => setDialogOpen(false)}
          width={2}
        >
          <Box padding={4}>
            <BunnyMediaLibrary
              allowedTypes={allowedTypes}
              onSelect={handleSelect}
              selectionMode={true}
            />
          </Box>
        </Dialog>
      )}

      {uploadDialogOpen && (
        <Dialog
          header="Upload Media"
          id="media-upload-dialog"
          onClose={() => setUploadDialogOpen(false)}
          width={2}
        >
          <Box padding={4}>
            <BunnyMediaLibrary
              allowedTypes={allowedTypes}
              selectionMode={false}
            />
          </Box>
        </Dialog>
      )}
    </Stack>
  );
}

export default MediaSelector;
