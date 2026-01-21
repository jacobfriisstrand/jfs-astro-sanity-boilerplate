import { Box, Button, Card, Flex, Stack, Text, TextInput } from "@sanity/ui";
import { useState } from "react";

type VideoUploadFormProps = {
  readonly onUploaded: () => Promise<void>;
};

export function VideoUploadForm({ onUploaded }: VideoUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setMessage("Please choose a video file first.");
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (title.trim()) {
        formData.append("title", title.trim());
      }

      const res = await fetch("/api/bunny/video/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setMessage("Video uploaded successfully.");
      setFile(null);
      setTitle("");
      await onUploaded();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card padding={3} radius={2} shadow={1} style={{ maxWidth: "500px" }}>
      <form onSubmit={handleSubmit}>
        <Stack space={3}>
          <Text>Upload Video to Bunny Stream</Text>
          <input
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            type="file"
          />
          {/* <input
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional video title"
            style={{
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
            type="text"
            value={title}
          /> */}

          <TextInput
            onChange={(event) => setTitle(event.currentTarget.value)}
            placeholder="Optional video title"
            value={title}
          />
          <Flex gap={2}>
            <Button
              disabled={uploading}
              text={uploading ? "Uploading..." : "Upload"}
              tone="primary"
              type="submit"
            />
            {message && (
              <Box padding={2}>
                <Text muted={uploading} size={1}>
                  {message}
                </Text>
              </Box>
            )}
          </Flex>
        </Stack>
      </form>
    </Card>
  );
}
