import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

function getManualChunk(id: string): string | undefined {
  if (!id.includes("node_modules")) {
    return undefined;
  }

  if (id.includes("/@supabase/") || id.includes("\\@supabase\\")) {
    return "supabase";
  }

  if (id.includes("/@tanstack/") || id.includes("\\@tanstack\\")) {
    return "query";
  }

  if (
    id.includes("/@hookform/") ||
    id.includes("\\@hookform\\") ||
    id.includes("/react-hook-form/") ||
    id.includes("\\react-hook-form\\") ||
    id.includes("/zod/") ||
    id.includes("\\zod\\")
  ) {
    return "forms";
  }

  if (
    id.includes("/react/") ||
    id.includes("\\react\\") ||
    id.includes("/react-dom/") ||
    id.includes("\\react-dom\\") ||
    id.includes("/react-router/") ||
    id.includes("\\react-router\\") ||
    id.includes("/react-router-dom/") ||
    id.includes("\\react-router-dom\\")
  ) {
    return "react";
  }

  return "vendor";
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_BASE_PATH || "/";

  return {
    base,
    plugins: [react()],
    resolve: {
      alias: {
        "@": "/src"
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: getManualChunk
        }
      }
    }
  };
});
