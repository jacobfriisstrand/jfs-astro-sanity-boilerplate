import { Box, Spinner } from "@sanity/ui";

export function LoadingState() {
  return (
    <Box
      padding={4}
      style={{
        display: "flex",
        justifyContent: "center",
        height: "calc(100svh - 90px)",
        alignItems: "center",
      }}
    >
      <Spinner muted />
    </Box>
  );
}
