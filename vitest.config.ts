import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig(async () => {
  const { default: react } = await import("@vitejs/plugin-react");

  return {
    plugins: [react()],
    test: {
      environment: "jsdom",
      setupFiles: ["./vitest.setup.ts"],
      globals: true,
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  };
});

