/** Resolve files copied from public/ to an absolute URL for CSS and inline styles. */
export const assetUrl = (path: string) => {
  const normalizedPath = path.replace(/^\/+/, '');

  if (typeof document === 'undefined') {
    return `${import.meta.env.BASE_URL}${normalizedPath}`;
  }

  return new URL(`${import.meta.env.BASE_URL}${normalizedPath}`, document.baseURI).href;
};
