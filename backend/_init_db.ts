import { Database } from 'bun:sqlite';
const db = new Database(process.env.DATABASE_URL?.replace('file:', '') || './prisma/dev2.db', { create: true });
const sql = require('fs').readFileSync('_schema.sql', 'utf-8');
db.exec(sql);
console.log('Database initialized successfully');
db.close();
