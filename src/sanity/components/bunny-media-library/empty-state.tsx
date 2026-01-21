import { Card, Text } from "@sanity/ui";

export function EmptyState() {
  return (
    <Card padding={4}>
      <Text muted>No media found in your Bunny library.</Text>
    </Card>
  );
}
