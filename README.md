# Simple Sorting Webapp

A drag-and-drop dashboard for sorting items into categories across multiple questions. Built with vanilla JS and Express.

## How it works

1. **Add items** — things you want to sort (supports comma-separated batch add)
2. **Add questions** — each question has its own set of categories
3. **Drag & drop** items into categories for each question
4. Everything is persisted to JSON files on disk

## Setup

```bash
npm install
node server.js
```

Open http://localhost:3777

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/questions` | List all questions |
| POST | `/api/questions` | Create a question |
| PUT | `/api/questions/:id` | Update a question |
| DELETE | `/api/questions/:id` | Delete a question |
| GET | `/api/items` | List all items |
| POST | `/api/items` | Create an item |
| PUT | `/api/items/:id` | Update an item |
| DELETE | `/api/items/:id` | Delete an item |
| POST | `/api/assign` | Assign an item to a category |
