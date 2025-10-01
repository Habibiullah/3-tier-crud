// server.js
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'appdb',
};

let pool;

// retry connection until MySQL is ready
async function initDb(retries = 15, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      pool = await mysql.createPool({ ...DB_CONFIG, waitForConnections: true, connectionLimit: 10 });
      await pool.query('SELECT 1'); // test query
      console.log("✅ Connected to MySQL");
      return;
    } catch (err) {
      console.error(`❌ DB connection failed (attempt ${i + 1}/${retries}): ${err.message}`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw new Error("Could not connect to database after retries");
}

// --- CRUD routes ---
app.get('/items', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM items ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'db error' });
  }
});

app.post('/items', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const [result] = await pool.query(
      'INSERT INTO items (name, description) VALUES (?, ?)',
      [name, description || null]
    );
    const [rows] = await pool.query('SELECT * FROM items WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'db error' });
  }
});

app.put('/items/:id', async (req, res) => {
  try {
    const { name, description } = req.body;
    const [result] = await pool.query(
      'UPDATE items SET name = ?, description = ? WHERE id = ?',
      [name, description, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'not found' });
    const [rows] = await pool.query('SELECT * FROM items WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'db error' });
  }
});

app.delete('/items/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM items WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'db error' });
  }
});

// --- Start server only after DB is ready ---
(async () => {
  try {
    await initDb();
    app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
