# Wind Power Procurement Dashboard - Backend

## Environment Variables

Create a `.env` file in this directory:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

## Running Locally

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Running with Docker

```bash
docker build -t wind-dashboard-api .
docker run -p 8000:8000 --env-file .env wind-dashboard-api
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/api/forecast/latest?date=YYYY-MM-DD` | Latest forecast for a date |
| GET | `/api/forecast/history` | All Jan 2026 forecasts |
| GET | `/api/accuracy/summary` | MAE, RMSE, bias for Jan 2026 |
| GET | `/api/accuracy/by-leadtime` | Accuracy by lead-time bucket |
| GET | `/api/accuracy/actuals-vs-forecast` | Scatter plot data (max 200 pts) |
| POST | `/api/chat` | AI wind analyst chatbot |

Interactive docs: http://localhost:8000/docs
