import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

let loaded = false;

export function loadEnv(): void {
  if (loaded) return;

  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'backend', '.env'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      loaded = true;
      return;
    }
  }

  // Fallback: attempt default resolution (no explicit path)
  dotenv.config();
  loaded = true;
}

// Auto-load on import so modules have env available early.
loadEnv();
