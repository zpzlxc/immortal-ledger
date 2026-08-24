/** Resolve files copied from public/ against the Vite deployment base path. */
export const assetUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
