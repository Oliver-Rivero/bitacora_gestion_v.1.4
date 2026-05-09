import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'finanzas.db');
const db = new Database(dbPath);

console.log('--- Entities ---');
console.log(db.prepare('SELECT * FROM entities').all());

console.log('--- Categories ---');
console.log(db.prepare('SELECT * FROM categories').all());

console.log('--- Subcategories ---');
console.log(db.prepare('SELECT * FROM subcategories').all());
