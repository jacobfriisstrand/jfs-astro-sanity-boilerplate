import { defineConfig } from "sanity";
import { presentationTool } from "sanity/presentation";
import { structureTool } from "sanity/structure";
import BunnyMediaLibrary from "@/sanity/components/bunny-media-library/bunny-media-library";
import { excludedSchemaTypes } from "@/sanity/constants/excluded-schema-types";
import { schema } from "@/sanity/schema-types";
import { structure } from "@/sanity/structure";

// Support both Node.js (typegen) and browser (studio)
const projectId =
  typeof process !== "undefined"
    ? process.env.PUBLIC_SANITY_PROJECT_ID
    : import.meta.env.PUBLIC_SANITY_PROJECT_ID;

const dataset =
  typeof process !== "undefined"
    ? process.env.PUBLIC_SANITY_DATASET
    : import.meta.env.PUBLIC_SANITY_DATASET;

export default defineConfig({
  projectId: projectId || "",
  dataset: dataset || "",
  plugins: [
    structureTool({
      structure,
    }),
    presentationTool({
      previewUrl: "/studio",
    }),
  ],
  schema,
  tools: [
    {
      name: "mediaLibrary",
      title: "Media Library",
      component: BunnyMediaLibrary,
    },
  ],
  document: {
    newDocumentOptions: (prev) => {
      // Filter out excluded document types from the "New document" menu
      return prev.filter(
        (templateItem) => !excludedSchemaTypes.includes(templateItem.templateId)
      );
    },
  },
});
