import { Pool } from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
export const db = new Pool({ connectionString: process.env.DATABASE_URL });

// pg removes failed idle clients from the pool. Keep the process available for readiness probes.
db.on('error', (error) => console.error('Idle database connection closed:', error.message));
