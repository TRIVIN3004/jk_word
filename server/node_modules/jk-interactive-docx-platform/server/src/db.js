import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the project root (two levels up from src/)
const envPath = path.resolve(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Still keep DB_FILE for the seeder script reference
const DATA_DIR = path.join(__dirname, '..', 'data');
export const DB_FILE = path.join(DATA_DIR, 'db.json');

export default supabase;
