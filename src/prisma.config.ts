import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// 1. Explicitly load .env variables
dotenv.config();

/**
 * Prisma Configuration Helper for SymbiOS
 * Handles the DATABASE_URL logic for PostgreSQL (Managed) and local development.
 */
const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL is required in production.');
    }
    // Fallback to local SQLite for development if nothing is provided
    return 'file:./dev.db';
  }
  return url;
};

// 2. Map the environment variable for Prisma
process.env.DATABASE_URL = getDatabaseUrl();

// 3. Initialize Unified Client (Environment Variable based)
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'info', 'warn', 'error'],
});

export default prisma;
