import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: {
    dataset: process.env.PUBLIC_SANITY_DATASET,
    projectId: process.env.PUBLIC_SANITY_PROJECT_ID,
  },
  typegen: {
    enabled: true,
  },
});
