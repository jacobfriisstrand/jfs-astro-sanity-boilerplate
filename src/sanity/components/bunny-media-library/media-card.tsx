import {
  Box,
  Button,
  Card,
  Dialog,
  Flex,
  Spinner,
  Stack,
  Text,
} from "@sanity/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BunnyStorageFile, BunnyVideo } from "./types";

type MediaCardVideoProps = {
  readonly kind: "video";
  readonly video: BunnyVideo;
  readonly onDeleted: () => Promise<void>;
  readonly onClick?: () => void;
  readonly selectionMode?: boolean;
};

type MediaCardImageProps = {
  readonly kind: "image";
  readonly file: BunnyStorageFile;
  readonly onDeleted: () => Promise<void>;
  readonly onClick?: () => void;
  readonly selectionMode?: boolean;
};

export type MediaCardProps = MediaCardVideoProps | MediaCardImageProps;

function useMediaCardState(isVideo: boolean) {
  const [cacheBuster, setCacheBuster] = useState(0);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isLoadingThumbnail, setIsLoadingThumbnail] = useState(isVideo);

  useEffect(
    () => () => {
      if (retryTimeoutRef.current !== null) {
        globalThis.clearTimeout(retryTimeoutRef.current);
      }
    },
    []
  );

  return {
    cacheBuster,
    setCacheBuster,
    retryCountRef,
    retryTimeoutRef,
    confirmOpen,
    setConfirmOpen,
    deleting,
    setDeleting,
    isLoadingThumbnail,
    setIsLoadingThumbnail,
  };
}

function getMediaMeta(props: MediaCardProps) {
  const isVideo = props.kind === "video";
  const id = isVideo ? props.video.guid : props.file.Guid;
  const title = isVideo
    ? props.video.title || "Untitled"
    : props.file.ObjectName;
  const footerText = isVideo
    ? `${Math.floor(props.video.length / 60)}:${String(
        props.video.length % 60
      ).padStart(2, "0")}`
    : `${(props.file.Length / 1024).toFixed(1)} KB`;

  return { isVideo, id, title, footerText };
}

export function MediaCard(props: MediaCardProps) {
  const { isVideo, id, title, footerText } = getMediaMeta(props);
  const {
    cacheBuster,
    setCacheBuster,
    retryCountRef,
    retryTimeoutRef,
    confirmOpen,
    setConfirmOpen,
    deleting,
    setDeleting,
    isLoadingThumbnail,
    setIsLoadingThumbnail,
  } = useMediaCardState(isVideo);

  const selectionMode = props.selectionMode;
  const handleCardClick = () => {
    if (selectionMode && props.onClick) {
      props.onClick();
    }
  };

  const getThumbnailUrl = () => {
    if (props.kind === "image") {
      return props.file.thumbnailUrl;
    }
    // For client-side access in Vite, env vars need PUBLIC_ prefix
    // Guard against CJS context (schema extraction) where import.meta is not available
    let cdnHostname: string | undefined;
    try {
      cdnHostname = import.meta.env?.PUBLIC_BUNNY_CDN_HOSTNAME;
    } catch {
      // import.meta not available (CJS context during schema extraction)
      cdnHostname = undefined;
    }
    if (!cdnHostname) {
      console.error("Missing PUBLIC_BUNNY_CDN_HOSTNAME environment variable");
    }
    const base = `https://${cdnHostname || ""}/${props.video.guid}/thumbnail.jpg`;
    return cacheBuster ? `${base}?r=${cacheBuster}` : base;
  };

  const thumbnailUrl = getThumbnailUrl();

  const handleImageError = () => {
    if (!isVideo) {
      return;
    }
    // Bunny Stream may take a little time to generate the thumbnail.
    // Retry a few times with a cache-busting query param instead of requiring a full page reload.
    if (!isLoadingThumbnail) {
      return;
    }
    if (retryCountRef.current >= 6) {
      return; // Retry up to ~30 seconds
    }
    retryCountRef.current += 1;
    retryTimeoutRef.current = globalThis.setTimeout(() => {
      setCacheBuster((value) => value + 1);
    }, 5000);
  };

  const handleImageLoad = () => {
    if (isLoadingThumbnail) {
      setIsLoadingThumbnail(false);
    }
    if (retryTimeoutRef.current !== null) {
      globalThis.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };

  const handleDelete = useCallback(async () => {
    try {
      setDeleting(true);
      let res: Response;

      if (props.kind === "video") {
        res = await fetch("/api/bunny/video/delete", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ videoId: props.video.guid }),
        });
      } else {
        res = await fetch("/api/bunny/image/delete", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            storagePath: props.file.storagePath,
          }),
        });
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Keep this simple in Studio; log and bail
        console.error("Failed to delete media", data);
        setDeleting(false);
        return;
      }

      setDeleting(false);
      setConfirmOpen(false);
      await props.onDeleted();
    } catch (err) {
      console.error("Error deleting media", err);
      setDeleting(false);
    }
  }, [props, setConfirmOpen, setDeleting]);

  return (
    <>
      <Card
        key={id}
        onClick={selectionMode ? handleCardClick : undefined}
        onMouseEnter={
          selectionMode
            ? (e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
              }
            : undefined
        }
        onMouseLeave={
          selectionMode
            ? (e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.12)";
              }
            : undefined
        }
        padding={2}
        radius={2}
        shadow={1}
        style={{
          cursor: selectionMode ? "pointer" : "default",
          transition: selectionMode ? "all 0.2s" : undefined,
        }}
      >
        <Stack space={2}>
          <Box
            style={{
              aspectRatio: "16/9",
              backgroundColor: "#1a1a1a",
              borderRadius: "4px",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {isVideo && isLoadingThumbnail && (
              <div
                style={{
                  height: "100%",
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Stack padding={4} space={4} style={{ textAlign: "center" }}>
                  <Spinner muted />
                  <Text muted size={1}>
                    Loading thumbnail…
                  </Text>
                </Stack>
              </div>
            )}
            {/* biome-ignore lint: Needed for image loading */}
            <img
              alt={title}
              height={180}
              onError={handleImageError}
              onLoad={handleImageLoad}
              src={thumbnailUrl}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: isVideo && isLoadingThumbnail ? "none" : "block",
              }}
              width={320}
            />
          </Box>
          <Text size={1} textOverflow="ellipsis">
            {title}
          </Text>
          <Flex align="center" justify="space-between">
            <Text muted size={0}>
              {footerText}
            </Text>
            {!selectionMode && (
              <Button
                fontSize={1}
                mode="bleed"
                onClick={() => setConfirmOpen(true)}
                padding={2}
                text="Delete"
                tone="critical"
              />
            )}
            {selectionMode && (
              <Text muted size={0}>
                Click to select
              </Text>
            )}
          </Flex>
        </Stack>
      </Card>

      {confirmOpen && (
        <Dialog
          header={isVideo ? "Delete video" : "Delete image"}
          id={`delete-media-${id}`}
          onClose={() => {
            if (!deleting) {
              setConfirmOpen(false);
            }
          }}
        >
          <Stack padding={4} space={4}>
            <Text>
              Are you sure you want to delete this {isVideo ? "video" : "image"}{" "}
              from Bunny? This action cannot be undone.
            </Text>
            <Flex gap={2} justify="flex-end">
              <Button
                disabled={deleting}
                mode="ghost"
                onClick={() => setConfirmOpen(false)}
                text="Cancel"
                tone="default"
              />
              <Button
                disabled={deleting}
                onClick={handleDelete}
                text={deleting ? "Deleting..." : "Delete"}
                tone="critical"
              />
            </Flex>
          </Stack>
        </Dialog>
      )}
    </>
  );
}
