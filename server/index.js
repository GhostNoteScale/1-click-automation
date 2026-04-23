import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// For ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const dbPath = join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Connected to SQLite database.');

        // Create tables
        db.serialize(() => {
            db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL
        )
      `);

            db.run(`
        CREATE TABLE IF NOT EXISTS bookmarks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          input TEXT,
          output TEXT,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);
        });
    }
});

// --- API Endpoints ---

// Register
app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const stmt = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
    stmt.run([name, email, password], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ error: 'Email already exists' });
            }
            return res.status(500).json({ error: err.message });
        }

        // Return user info (excluding password in real app, simplified here)
        res.status(201).json({
            user: { id: this.lastID, name, email }
        });
    });
    stmt.finalize();
});

// Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        res.json({
            user: { id: row.id, name: row.name, email: row.email }
        });
    });
});

// Get Bookmarks for a user
app.get('/api/bookmarks/:userId', (req, res) => {
    const userId = req.params.userId;

    db.all('SELECT * FROM bookmarks WHERE user_id = ?', [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ bookmarks: rows });
    });
});

// Add a Bookmark
app.post('/api/bookmarks', (req, res) => {
    const { userId, title, description, input, output } = req.body;

    const stmt = db.prepare('INSERT INTO bookmarks (user_id, title, description, input, output) VALUES (?, ?, ?, ?, ?)');
    stmt.run([userId, title, description, input, output], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: 'Bookmark added', id: this.lastID });
    });
    stmt.finalize();
});

// Delete a Bookmark
app.delete('/api/bookmarks/:userId/:title', (req, res) => {
    const { userId, title } = req.params;

    const stmt = db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND title = ?');
    stmt.run([userId, title], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Bookmark removed', changes: this.changes });
    });
    stmt.finalize();
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
