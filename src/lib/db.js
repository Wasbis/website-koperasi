import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

let db = null;

export async function openDb() {
  if (!db) {
    // Mengakses database yang ada di dalam folder project (web-koperasi)
    const dbPath = path.join(process.cwd(), 'Koperasi_Voucher_2025.db');
    
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
  }
  return db;
}
