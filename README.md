# Moodify AI — Music Mood & Recommendation Engine

Full-stack mini-project built with React/Vite and Flask. This package includes `backend/data/spotify_tracks.csv` and a `backend/data/music_tracks.csv` file. The API loads `spotify_tracks.csv` by default.

## Dataset
Copy the CSV to `backend/data/spotify_tracks.csv`. Required source columns include `track_id`, `track_name`, `artists`, `track_genre`, and numeric fields `danceability`, `energy`, `valence`, `acousticness`, `instrumentalness`, `speechiness`, `liveness`, `tempo`, and `popularity`. Verify the repository's current license and attribution terms before submitting or redistributing the dataset. The CSV is gitignored by default.

## Run on Windows PowerShell

Terminal 1 (project root):
```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
cd backend
..\.venv\Scripts\python.exe app.py
```
Backend: `http://127.0.0.1:5001`.

Terminal 2:
```powershell
cd frontend
& "C:\Program Files\nodejs\npm.cmd" install
& "C:\Program Files\nodejs\npm.cmd" run dev
```
Open the Vite URL printed in the terminal, usually `http://localhost:5173`.

The frontend defaults to `http://127.0.0.1:5001`, matching the Flask backend. To override it, set `VITE_API_URL` in `frontend/.env` and restart Vite.

## Endpoints
- `/api/health`
- `/api/debug-data`
- `/api/tracks?limit=100&q=...&mood=Happy&genre=pop`
- `/api/moods`
- `/api/recommendations/<track_id>?method=cosine|knn|popularity&limit=8`
- `/api/analytics`
- `/api/model-comparison`
- `/api/recommendation-evaluation?k=10&samples=40`

## Evaluation caveat
Mood labels are generated from energy and valence rules; they are not human-annotated ground truth. Classification metrics measure reproduction of those rules. Recommendation evaluation defines relevance as matching the heuristic mood and measures mood consistency, not human satisfaction. Clustering silhouette scores are not comparable to classification scores. Report only metrics actually returned by your final run and discuss these limitations.

See `report/REPORT_DRAFT.md` for a report scaffold. Complete the literature review with at least five recent papers verified from publisher/DOI records, add screenshots and actual results, and follow your course's formatting instructions.
