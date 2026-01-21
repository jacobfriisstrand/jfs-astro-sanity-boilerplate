import { useCallback, useEffect, useState } from "react";
import type { BunnyStorageFile, BunnyVideo } from "./types";

export function useBunnyMedia() {
  const [videos, setVideos] = useState<BunnyVideo[]>([]);
  const [storageFiles, setStorageFiles] = useState<BunnyStorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    const res = await fetch("/api/bunny/video/list");
    const data = await res.json();
    if (res.ok) {
      setVideos(data.items || []);
    } else {
      console.error("Videos fetch error:", data.error);
      throw new Error(data.error || "Failed to fetch videos");
    }
  }, []);

  const fetchStorage = useCallback(async () => {
    const res = await fetch("/api/bunny/image/list");
    const data: BunnyStorageFile[] | { error: string } = await res.json();
    if (!res.ok) {
      console.error("Storage fetch error:", (data as { error: string }).error);
      throw new Error(
        (data as { error: string }).error || "Failed to fetch storage files"
      );
    }
    if (Array.isArray(data)) {
      const imageFiles = data.filter((file) => !file.IsDirectory);
      setStorageFiles(imageFiles);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchVideos(), fetchStorage()]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [fetchStorage, fetchVideos]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { videos, storageFiles, loading, error, refresh };
}
