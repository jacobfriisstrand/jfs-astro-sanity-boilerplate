import { cva } from "class-variance-authority";

export const headingVariants = cva("tracking-tight", {
  variants: {
    size: {
      h1: "text-5xl leading-none lg:text-6xl",
      h2: "text-3xl leading-none lg:text-4xl",
      h3: "text-xl leading-none lg:text-2xl",
      h4: "text-md leading-none lg:text-lg",
    },
    colorScheme: {
      light: "text-light",
      dark: "text-dark",
    },
  },
  defaultVariants: {
    size: "h1",
    colorScheme: "dark",
  },
});

export const paragraphVariants = cva("text-balance leading-24", {
  variants: {
    size: {
      default: "text-xs lg:text-sm",
    },
    colorScheme: {
      light: "text-light",
      dark: "text-dark",
    },
  },
  defaultVariants: {
    size: "default",
    colorScheme: "dark",
  },
});
