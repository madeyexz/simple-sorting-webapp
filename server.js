const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3777;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const QUESTIONS_FILE = path.join(__dirname, 'data', 'questions.json');
const ITEMS_FILE = path.join(__dirname, 'data', 'items.json');

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// --- Questions API ---

app.get('/api/questions', (req, res) => {
  res.json(readJSON(QUESTIONS_FILE));
});

app.post('/api/questions', (req, res) => {
  const questions = readJSON(QUESTIONS_FILE);
  const question = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text: req.body.text,
    categories: req.body.categories || [],
  };
  questions.push(question);
  writeJSON(QUESTIONS_FILE, questions);
  res.json(question);
});

app.put('/api/questions/:id', (req, res) => {
  const questions = readJSON(QUESTIONS_FILE);
  const idx = questions.findIndex(q => q.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  questions[idx] = { ...questions[idx], ...req.body };
  writeJSON(QUESTIONS_FILE, questions);
  res.json(questions[idx]);
});

app.delete('/api/questions/:id', (req, res) => {
  let questions = readJSON(QUESTIONS_FILE);
  questions = questions.filter(q => q.id !== req.params.id);
  writeJSON(QUESTIONS_FILE, questions);
  // Also remove assignments for this question
  let items = readJSON(ITEMS_FILE);
  items.forEach(item => { delete item.assignments[req.params.id]; });
  writeJSON(ITEMS_FILE, items);
  res.json({ ok: true });
});

// --- Items API ---

app.get('/api/items', (req, res) => {
  res.json(readJSON(ITEMS_FILE));
});

app.post('/api/items', (req, res) => {
  const items = readJSON(ITEMS_FILE);
  const item = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: req.body.name,
    assignments: {},  // { questionId: categoryName }
  };
  items.push(item);
  writeJSON(ITEMS_FILE, items);
  res.json(item);
});

app.put('/api/items/:id', (req, res) => {
  const items = readJSON(ITEMS_FILE);
  const idx = items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  items[idx] = { ...items[idx], ...req.body };
  writeJSON(ITEMS_FILE, items);
  res.json(items[idx]);
});

app.delete('/api/items/:id', (req, res) => {
  let items = readJSON(ITEMS_FILE);
  items = items.filter(i => i.id !== req.params.id);
  writeJSON(ITEMS_FILE, items);
  res.json({ ok: true });
});

// --- Assign item to category ---

app.post('/api/assign', (req, res) => {
  const { itemId, questionId, category } = req.body;
  const items = readJSON(ITEMS_FILE);
  const idx = items.findIndex(i => i.id === itemId);
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });
  if (category === null || category === undefined) {
    delete items[idx].assignments[questionId];
  } else {
    items[idx].assignments[questionId] = category;
  }
  writeJSON(ITEMS_FILE, items);
  res.json(items[idx]);
});

app.listen(PORT, () => {
  console.log(`Dashboard running at http://localhost:${PORT}`);
});
