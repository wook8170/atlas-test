/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  // GitHub Pages 프로젝트 사이트(/atlas-test/) 대응. dev 에서는 루트.
  base: command === "build" ? "/atlas-test/" : "/",
  plugins: [react()],
  server: {
    host: true,
    port: 7000,
    strictPort: true,
    // 프록시된 미리보기 호스트(임의 도메인)에서의 접근 허용 — 403 방지
    allowedHosts: true,
    cors: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
}));
