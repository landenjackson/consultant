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

// Mock Vercel response object for our handler
app.post('/api/chat', async (req, res) => {
    const vercelRes = {
        status: (code) => ({
            json: (data) => res.status(code).json(data),
            end: () => res.status(code).end()
        }),
        setHeader: (name, value) => res.setHeader(name, value),
        json: (data) => res.json(data)
    };
    
    await handler(req, vercelRes);
});

// Fallback to index.html for PWA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Consultant Studio running at http://localhost:${port}`);
});
