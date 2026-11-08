import { defineConfig } from "sanity";
import { presentationTool } from "sanity/presentation";
import { structureTool } from "sanity/structure";
import { muxInput } from "sanity-plugin-mux-input";
import { excludedSchemaTypes } from "@/sanity/constants/excluded-schema-types";
import { locations, mainDocuments } from "@/sanity/presentation/resolve";
import { schema } from "@/sanity/schema-types";
import { structure } from "@/sanity/structure";

// Support both Node.js (typegen) and browser (studio)
const projectId =
  typeof process === "undefined"
    ? import.meta.env.PUBLIC_SANITY_PROJECT_ID
    : process.env.PUBLIC_SANITY_PROJECT_ID;

const dataset =
  typeof process === "undefined"
    ? import.meta.env.PUBLIC_SANITY_DATASET
    : process.env.PUBLIC_SANITY_DATASET;

export default defineConfig({
  dataset: dataset || "",
  document: {
    newDocumentOptions: (prev) => {
      // Filter out excluded document types from the "New document" menu
      return prev.filter(
        (templateItem) => !excludedSchemaTypes.includes(templateItem.templateId)
      );
    },
  },
  plugins: [
    structureTool({
      structure,
    }),
    presentationTool({
      previewUrl: {
        previewMode: {
          disable: "/api/draft-mode/disable",
          enable: "/api/draft-mode/enable",
        },
      },
      resolve: { locations, mainDocuments },
    }),
    muxInput(),
  ],
  projectId: projectId || "",
  schema,
});
