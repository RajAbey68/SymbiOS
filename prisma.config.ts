// Symbio — Prisma 7 Configuration
// Connection URL is managed here, NOT in schema.prisma
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Defaults to DATABASE_URL from .env
    // For Docker Compose: use .env.docker → postgresql://antigravity:supersecretpassword@localhost:5432/roleos
    // For Prisma dev server: use .env → prisma+postgres://localhost:51213/...
    url: process.env["DATABASE_URL"],
  },
});
