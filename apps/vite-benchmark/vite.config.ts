import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { reactless } from "@reactless/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [reactless(), react()],
});
