// prisma.config.ts
import { defineConfig } from '@prisma/config';

export default defineConfig({
  // Tentukan lokasi file skema Anda sebagai string
  schema: './prisma/schema.prisma',
  
  // Konfigurasi datasource
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});