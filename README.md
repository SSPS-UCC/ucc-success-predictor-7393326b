# UCC Success Predictor

# Student Success Prediction System (SSPS)

## Overview
The Student Success Prediction System (SSPS) is a web-based machine learning application developed to predict the final academic performance of students at the University of Cape Coast (College of Distance Education). The system assists students by predicting their likely final CGPA and graduation classification based on their academic performance and provides recommendations for improvement.

## Features
- Student registration and login
- Secure authentication
- Password recovery
- CGPA prediction using a trained machine learning model
- Personalized academic recommendations
- Prediction history
- Export prediction reports (CSV/PDF)
- Administrator dashboard
- User management

## Technologies Used
- Lovable AI
- React
- TypeScript
- Tailwind CSS
- Supabase
- PostgreSQL
- Python
- Scikit-learn
- GitHub

## Machine Learning Model
The deployed prediction model is Ridge Regression, selected after evaluating multiple regression models using:
- R² Score
- Mean Absolute Error (MAE)
- Root Mean Squared Error (RMSE)

## Installation

Clone the repository:

```bash
git clone https://github.com/yourusername/ucc-success-predictor.git
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

## Live Demo

https://ucc-success-predictor.lovable.app

## Author

Renato Andoh

Bachelor of Science in Information Technology

University of Cape Coast

2026
Updated deployment

## Deploying on Render (Web Service)

The project builds a standalone Node SSR server (Nitro `node-server` preset).

1. Push the repo to GitHub and in Render choose **New → Web Service** (or **Blueprint** to use `render.yaml`).
2. Settings:
   - Runtime: **Node** (Node 22)
   - Build command: `npm ci && npm run build`
   - Start command: `npm start` (runs `node .output/server/index.mjs`)
   - Health check path: `/`
3. Environment variables (Render → Environment):
   - `NITRO_PRESET=node-server`
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (used during SSR)

Render injects `PORT` automatically and the server binds to it.
