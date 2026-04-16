export type NavItemLink = {
  label?: string;
  hasSubmenu?: boolean;
  linkType?: "internal" | "external";
  internalPage?: { _type?: string; slug?: { current?: string } };
  externalUrl?: string;
  openInNewWindow?: boolean;
  children?: NavItemLink[];
};

export function extractLink(item: NavItemLink) {
  const { children: _children, ...linkProps } = item;
  return linkProps;
}
