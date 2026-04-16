/**
 * Shared GROQ link projection for dereferencing internal pages.
 * Includes slugMode and parentPage for building hierarchical URLs.
 */
export const linkProjection = `
  label,
  hasSubmenu,
  linkType,
  openInNewWindow,
  linkType == "internal" => {
    "internalPage": internalPage->{
      _type,
      slug,
      slugMode,
      "parentPage": parentPage->{
        _type,
        slug,
        slugMode,
        "parentPage": parentPage->{
          _type,
          slug
        }
      }
    }
  },
  linkType == "external" => {
    externalUrl
  }
`;
