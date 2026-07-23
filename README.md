# Next Play - Kanban Task Board

A fully-featured, Kanban-style task management board inspired by Asana and Linear. Built with React, Vite, Tailwind CSS, and Supabase. 

## Features
* **Guest Authentication:** Frictionless anonymous login via Supabase Auth.
* **Interactive Kanban Board:** Smooth drag-and-drop task management.
* **Glassmorphism UI:** Modern, frosted-glass interface with customizable Unsplash backgrounds.
* **Advanced Filtering & Search:** Instantly filter tasks by title, priority, or custom tags.
* **Dynamic Progress Bars:** Color-shifting HSL progress sliders for granular task tracking.
* **Labeling System:** Create and assign custom pill-based tags to any task.
* **Smart Due Dates:** Automatically calculates relative times (e.g., "in 3 days", "⚠️ Overdue").

## Tech Stack
* **Frontend:** React (TypeScript), Vite, Tailwind CSS
* **Backend / Database:** Supabase (PostgreSQL, Row Level Security)
* **Drag and Drop:** `@hello-pangea/dnd`

## Local Setup Instructions

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### 1. Clone the repository
```bash
git clone [https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git](https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git)
cd YOUR_REPO_NAME


### 2. Install dependencies
npm install


### 3. Environment variables
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key


### 4. Run the development server
npm run dev


Open http://localhost:5173 in your browser to view the app.
