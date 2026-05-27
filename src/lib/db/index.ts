/**
 * DevLog — Database Connection
 * Usando NeonDB Serverless + Drizzle ORM
 *
 * O neon() driver é otimizado para ambientes serverless (Next.js Edge / Serverless Functions).
 * Para uso em Node.js tradicional, use Pool do @neondatabase/serverless.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Verifica a variável de ambiente em build-time
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não está definida. Verifique o .env.local");
}

// Driver HTTP do Neon — ideal para Edge e Serverless
const sql = neon(process.env.DATABASE_URL);

// Instância do Drizzle com o schema completo para queries relacionais
export const db = drizzle(sql, { schema });

// Exporta os tipos para uso nos server actions e API routes
export type Database = typeof db;
