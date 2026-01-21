import { Card, Text } from "@sanity/ui";

type ErrorStateProps = {
  error: string;
};

export function ErrorState({ error }: ErrorStateProps) {
  return (
    <Card padding={4} tone="critical">
      <Text>Error: {error}</Text>
    </Card>
  );
}
