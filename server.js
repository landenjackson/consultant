import express from 'express';
import cors from 'cors';
import handler from './api/chat.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Express handler with full streaming support
app.post('/api/chat', async (req, res) => {
    await handler(req, res);
});

// Fallback to index.html for PWA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Consultant Studio running at http://localhost:${port}`);
});
