export interface NavItemLink {
  children?: NavItemLink[];
  externalUrl?: string;
  hasSubmenu?: boolean;
  internalPage?: { _type?: string; slug?: { current?: string } };
  label?: string;
  linkType?: "internal" | "external";
  openInNewWindow?: boolean;
}

export function extractLink(item: NavItemLink) {
  const { children: _children, ...linkProps } = item;
  return linkProps;
}
