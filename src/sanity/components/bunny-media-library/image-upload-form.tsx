import { Box, Button, Card, Flex, Stack, Text, TextInput } from "@sanity/ui";
import { useState } from "react";

type UploadFormProps = {
  readonly onUploaded: () => Promise<void>;
};

export function ImageUploadForm({ onUploaded }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const getFilename = (fileObj: File, titleValue: string): string => {
    if (!titleValue.trim()) {
      return fileObj.name;
    }
    const fileExtension = fileObj.name.split(".").pop() || "";
    return fileExtension
      ? `${titleValue.trim()}.${fileExtension}`
      : titleValue.trim();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setMessage("Please choose a file first.");
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const params = new URLSearchParams();
      const filename = getFilename(file, title);
      params.set("filename", filename);

      const res = await fetch(`/api/bunny/image/upload?${params.toString()}`, {
        method: "PUT",
        // Do NOT set Content-Type header so the browser uses the correct
        // application/octet-stream for the File body
        body: file,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setMessage("Uploaded successfully.");
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
          <Text>Upload Image to Bunny Storage</Text>
          <input
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            type="file"
          />
          <TextInput
            onChange={(event) => setTitle(event.currentTarget.value)}
            placeholder="Optional image title"
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
