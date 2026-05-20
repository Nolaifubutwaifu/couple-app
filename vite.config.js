import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@supabase")) return "supabase";
            return "vendor";
          }
          const name = id.split("/").pop();
          if (name === "games.js" || name === "date-night.js") return "features";
          if (name === "call.js") return "call";
          if (name === "data.js") return "data";
        }
      }
    }
  }
});
