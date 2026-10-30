require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const { createClient } = require("redis");
const { isValidUrl } = require("./validate");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = createClient({ url: process.env.REDIS_URL });
redis.on("error", (e) => console.error("redis error:", e.message));

const CACHE_KEY = "bookmarks:all";

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    await redis.ping();
    res.json({ status: "ok" });
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

app.get("/api/bookmarks", async (req, res) => {
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) return res.json({ source: "cache", data: JSON.parse(cached) });

    const { rows } = await pool.query(
      "SELECT id, title, url, created_at FROM bookmarks ORDER BY id DESC",
    );
    await redis.set(CACHE_KEY, JSON.stringify(rows), { EX: 60 });
    res.json({ source: "db", data: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/bookmarks", async (req, res) => {
  const { title, url } = req.body || {};
  if (!title || !title.trim())
    return res.status(400).json({ error: "title required" });
  if (!isValidUrl(url))
    return res.status(400).json({ error: "valid http(s) url required" });
  try {
    const { rows } = await pool.query(
      "INSERT INTO bookmarks (title, url) VALUES ($1, $2) RETURNING *",
      [title.trim(), url],
    );
    await redis.del(CACHE_KEY);
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/bookmarks/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM bookmarks WHERE id = $1", [req.params.id]);
    await redis.del(CACHE_KEY);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function start() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
  await redis.connect();
  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log(`API on :${port}`));
}

start().catch((e) => {
  console.error("startup failed:", e);
  process.exit(1);
});
