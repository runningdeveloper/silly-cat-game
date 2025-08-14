import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.NODE_ENV === "production" ? "/silly-cat-game/" : "/",
  publicDir: "public", // Explicitly set the public directory
  build: {
    target: "es2023", // Updated to ES2023 for 2025
    minify: "esbuild", // esbuild is faster and now default
    sourcemap: false, // Set to true for debugging production builds
    cssCodeSplit: true, // Split CSS into separate files
    chunkSizeWarningLimit: 1000, // Warn for chunks larger than 1MB
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code for better caching
          vendor: ["kontra"],
        },
      },
    },
  },
  // Modern development optimizations
  server: {
    hmr: true, // Hot module replacement
    open: true, // Auto-open browser on dev start
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ["kontra"],
  },
  // Modern CSS handling
  css: {
    devSourcemap: true,
  },
});
