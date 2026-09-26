# 🚀 Job Way: Career Discovery and Interview Preparation

Welcome to **Job Way**, a guided career-discovery and interview-preparation platform with role roadmaps, study manuscripts, and coding practice.

## Placement Preparation MVP

The repository includes an offline-first Job Way career portal:

- choose one of seven software-engineering career tracks;
- generate a company workflow from the cloned `liquidslr` company dataset;
- take an eight-question career compass;
- progress through four Easy/Medium/Hard phases with skip, restore, bulk opt-out, and swap controls;
- solve in a Python/Java workspace with three-case runs and ten-case submissions;
- watch topic or problem videos alongside the editor; and
- track company readiness in High Chance, Within Reach, and Stretch tiers.

From `frontend/`, `npm run dev` starts Vite and the FastAPI compatibility service together. If Python or the service is unavailable, the new screens remain browsable using the verified files in `frontend/public/`.

```bash
cd frontend
npm install
npm run dev
```

The placement API can also be started independently:

```bash
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
```

Run verification with `python -m unittest discover tests` and `npm run build` in `frontend/`.

This project was built for the hackathon and features a fully decoupled frontend and backend, a live code execution engine, and an automated scraping pipeline that continuously imports questions from top competitive programming platforms.

---

## 🌐 Live Demo

You don't need to run this locally to experience it! The project is fully deployed in the cloud:
- **Frontend App**: deploy the fresh Job Way repository with the included `vercel.json` configuration.
- **Backend API**: Deployed on Render
- **Code Executor Engine**: Custom Dockerized Engine deployed on Render
- **Database**: Supabase PostgreSQL

---

## ⭐ Highlighted Features (As Requested by Judges)

### 1. 📥 Universal Exporter (XML, CSV, TXT)
The judges requested an **XML Downloader**, so we built a robust Export engine. From the Export page, administrators can seamlessly download the entire database of programming questions in three different formats:
- **XML Download**: Fully structured XML tree of questions.
- **CSV Download**: Spreadsheet-ready data for analytics.
- **TXT Download**: Clean, readable text format.

### 2. 🤖 Automated Web Scrapers (LeetCode & CSES)
We built a robust, Python-based scraping pipeline that pulls real problems directly into our platform. 
- **CSES Scraper**: Dynamically crawls `cses.fi` to pull introductory problems and injects them into our Supabase database natively.
- **Company Tags Automation**: We dynamically fetch company tags (Google, Meta, Apple, etc.) and tag them to questions in our database so users can filter by company.
- **GitHub Actions Integration**: We wrote a `.github/workflows/weekly_scraper.yml` script that runs these scrapers completely autonomously **every Sunday at midnight** in the cloud. Our database updates itself continuously without any human intervention!

### 3. 🧠 AI Theory Grader
Instead of just running code, our platform features an AI evaluation engine powered by **Llama 3** (via Groq). When users submit answers to system design or theory questions, the AI grades the answer based on a hidden scoring rubric and provides a score out of 100 with detailed feedback!

---

## 🏗️ Architecture & How It Works

- **Frontend**: Built with React, Vite, and TypeScript. It uses Axios to communicate with the backend and features a dynamic split-pane code editor.
- **Backend**: Built with Hono (a blazing fast web framework) and Node.js. It manages authentication, routing, and AI evaluation.
- **Database Layer**: We use **Prisma ORM** connecting to a **Supabase (PostgreSQL)** database. We heavily utilize Supabase's direct connection for our Python data seeders and connection pooling for our high-traffic backend.
- **Execution Engine**: We built a custom code execution server (`executor/server.js`) that runs inside a secured Linux Docker container to compile and run C++, Python, Java, and JavaScript safely.

---

## 💻 Running it Locally (For Judges)

If you'd like to test the repository on your local machine, the process is seamless.

### Prerequisites
- Node.js (v18+)
- Python 3.10+ (For scrapers)

### 1. Setup the Backend
```bash
cd backend
npm install
# Create a .env file with DATABASE_URL, DIRECT_URL, and GROQ_API_KEY
npx prisma generate
npm run dev
```
*(Backend runs on `http://localhost:3000`)*

### 2. Setup the Frontend
```bash
cd frontend
npm install
# Create a .env file with VITE_API_BASE=http://localhost:3000
npm run dev
```
*(Frontend runs on `http://localhost:5173`)*

### 3. Running the Scrapers Manually (Optional)
The scrapers run automatically via GitHub Actions in the cloud, but you can test them locally:
```bash
cd scraper
pip install -r requirements.txt
python cses_scraper.py
python seed_companies.py
```
