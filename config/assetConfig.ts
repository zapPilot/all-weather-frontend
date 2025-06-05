// Asset path configuration for different hosting environments
export const ASSET_CONFIG = {
  // Base path for static assets (images, etc.)
  getAssetBasePath: () => {
    // For GitHub Pages, we need to include the repo name
    if (process.env.NEXT_PUBLIC_HOSTING === "github-pages") {
      return "/all-weather-frontend";
    }
    // For other hosting (Fleek, Cloudflare Pages, etc.), use root path
    return "";
  },

  // Helper function to get full asset path
  getAssetPath: (path: string) => {
    const basePath = ASSET_CONFIG.getAssetBasePath();
    // Remove leading slash from path if it exists to avoid double slashes
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    return `${basePath}/${cleanPath}`;
  },
};
