import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { camelToPascal } from "./validation.js";

type MediaConfig = {
  allowedTypes: "both" | "image" | "video";
};

/**
 * Generate flexible page type schema file (with component builder)
 */
export function generatePageTypeSchema(
  name: string,
  title: string,
  iconName: string,
  fileName: string
): void {
  const content = `import { ${iconName} } from "@sanity/icons";
import { defineType } from "sanity";
import { basePageConfig } from "@/sanity/schema-types/core/base-page";
import { createComponentBuilder } from "@/sanity/schema-types/core/component-builder";

export const ${name} = defineType({
  name: "${name}",
  title: "${title}",
  icon: ${iconName},
  ...basePageConfig,
  fields: [createComponentBuilder("${name}"), ...basePageConfig.baseFields],
});
`;

  const filePath = join(
    process.cwd(),
    "src/sanity/schema-types/page-types",
    `${fileName}.ts`
  );
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf-8");
}

/**
 * Fixed page type schema data
 */
type FixedPageTypeData = {
  name: string;
  title: string;
  iconName: string;
  fileName: string;
};

/**
 * Generate fixed page type schema file (with predefined fields)
 * Creates a starter template with a headline field - extend with your own fields
 */
export function generateFixedPageTypeSchema(data: FixedPageTypeData): void {
  const { name, title, iconName } = data;

  const content = `import { ${iconName} } from "@sanity/icons";
import { defineField, defineType } from "sanity";
import { basePageConfig } from "@/sanity/schema-types/core/base-page";

/**
 * Fixed page type: ${title}
 *
 * 1. Add your custom fields below the starter "headline" field
 * 2. Run \`npm run typegen\` to update TypeScript types
 * 3. Update src/pages/_${name}.astro to render the fields
 * 4. Import and add to src/pages/[slug].astro
 */
export const ${name} = defineType({
  name: "${name}",
  title: "${title}",
  icon: ${iconName},
  ...basePageConfig,
  fields: [
    // Starter field - replace/extend with your own fields
    defineField({
      name: "headline",
      title: "Headline",
      type: "string",
      group: "content",
      validation: (rule) => rule.required(),
    }),
    // Add more fields here as needed, e.g.:
    // defineField({
    //   name: "eventDate",
    //   title: "Event Date",
    //   type: "datetime",
    //   group: "content",
    // }),
    ...basePageConfig.baseFields,
  ],
});
`;

  const filePath = join(
    process.cwd(),
    "src/sanity/schema-types/page-types",
    `${data.fileName}.ts`
  );
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf-8");
}

/**
 * Generate Astro template for fixed page types
 * Templates are placed in src/pages/ with underscore prefix (e.g., _event.astro)
 */
export function generateFixedPageTypeTemplate(
  name: string,
  title: string,
  fileName: string
): void {
  const pascalName = camelToPascal(name);

  const content = `---
import type { ${pascalName} } from "sanity.types";
import Heading from "@/components/ui/typography/heading.astro";

/**
 * Template for ${title} page type
 *
 * To add new fields:
 * 1. Edit the schema file: src/sanity/schema-types/page-types/${fileName}.ts
 * 2. Run \`npm run typegen\` to update TypeScript types
 * 3. Add rendering for those fields below
 */
type Props = {
  page: ${pascalName};
};

const { page } = Astro.props;
---

<article>
  <section>
    <Heading as="h1" size="h1">{page.headline}</Heading>
  </section>

  <!-- Add more sections here to render additional fields -->
</article>
`;

  const filePath = join(process.cwd(), "src/pages", `_${name}.astro`);
  writeFileSync(filePath, content, "utf-8");
}

/**
 * Generate component schema file
 */
export function generateComponentSchema(
  name: string,
  title: string,
  fileName: string,
  media?: MediaConfig
): void {
  let content: string;

  if (media) {
    const allowedTypesArg =
      media.allowedTypes === "both"
        ? ""
        : `, allowedTypes: "${media.allowedTypes}"`;

    content = `import { defineField, defineType } from "sanity";
import { createMediaField } from "@/sanity/schema-types/core/media-selector";

export const ${name} = defineType({
  name: "${name}",
  title: "${title}",
  type: "object",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    createMediaField({ name: "media"${allowedTypesArg} }),
  ],
});
`;
  } else {
    content = `import { defineType } from "sanity";

export const ${name} = defineType({
  name: "${name}",
  title: "${title}",
  type: "object",
  fields: [
    {
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    },
  ],
});
`;
  }

  const filePath = join(
    process.cwd(),
    "src/sanity/schema-types/components",
    `${fileName}.ts`
  );
  writeFileSync(filePath, content, "utf-8");
}

/**
 * Generate Astro component file
 */
export function generateAstroComponent(
  name: string,
  fileName: string,
  media?: MediaConfig
): void {
  const pascalName = camelToPascal(name);

  let content: string;

  if (media) {
    content = `---
import type { ${pascalName} } from "sanity.types";
import Media from "@/components/media.astro";
import Heading from "@/components/ui/typography/heading.astro";

/**
 * Props type derived from auto-generated Sanity types
 * _key is optional - present when used in arrays (flexible pages), absent in fixed pages
 */
type Props = ${pascalName} & { _key?: string };

const { title, media } = Astro.props;
---

<section>
  <Heading as="h1" size="h1">{title}</Heading>
  {media && <Media media={media} />}
</section>
`;
  } else {
    content = `---
import type { ${pascalName} } from "sanity.types";
import Heading from "@/components/ui/typography/heading.astro";

/**
 * Props type derived from auto-generated Sanity types
 * _key is optional - present when used in arrays (flexible pages), absent in fixed pages
 */
type Props = ${pascalName} & { _key?: string };

const { title } = Astro.props;
---

<section>
  <Heading as="h1" size="h1">{title}</Heading>
</section>
`;
  }

  const filePath = join(process.cwd(), "src/components", `${fileName}.astro`);
  writeFileSync(filePath, content, "utf-8");
}

/**
 * Generate React component file (.tsx)
 */
export function generateReactComponent(
  name: string,
  fileName: string,
  media?: MediaConfig
): void {
  const pascalName = camelToPascal(name);

  const mediaNote = media
    ? "\n// Note: For media rendering in React, create a React-compatible media component\n// that handles the media field data from Sanity.\n"
    : "";

  const content = `import type { ${pascalName} as ${pascalName}Props } from "sanity.types";
${mediaNote}
/**
 * Props type derived from auto-generated Sanity types
 * _key is optional - present when used in arrays (flexible pages), absent in fixed pages
 */
type Props = ${pascalName}Props & { _key?: string };

function ${pascalName}(props: Props) {
  return (
    <section data-key={props._key}>
      <h1>{props.title}</h1>
    </section>
  );
}

export { ${pascalName} };
`;

  const filePath = join(process.cwd(), "src/components", `${fileName}.tsx`);
  writeFileSync(filePath, content, "utf-8");
}
