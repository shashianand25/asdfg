# WindTrader walkthrough recording script

Target runtime: 9 minutes total. Record the customer walkthrough first (about 4:25), then the technical review (about 4:25). Keep the whole video under 10 minutes.

## Part 1 — Customer walkthrough (about 4:25)

### 0:00–0:35 — Decision context

“For a day-ahead purchase, the team needs a clear view of the wind generation forecast available at decision time, and a grounded sense of how much that forecast can miss. WindTrader brings those two signals together using Elexon national wind data. This pilot is deliberately scoped to wind; it does not estimate total demand or prescribe a purchase volume.”

### 0:35–1:40 — Forecast Explorer

Open **Forecast Explorer** and select **15 January 2026**. Point out the delivery-period curve, the day-ahead and latest forecast series, and the settlement-period table. Explain that each table row makes the forecast revision visible, so a trader can see where the outlook moved between the D-1 cutoff and the latest pre-delivery publication.

For the cached demonstration sample, the latest outlook has a mean of about **11.1 GW**, with a peak of **16.5 GW at 05:30** and a low of **7.0 GW at 01:30**. At 05:30 the day-ahead value is **15.9 GW**, about **0.6 GW below** the latest forecast. These are historical January 2026 example values, not a live trading recommendation.

### 1:40–2:10 — Revisions and export

Sort the table by revision and show how the sign indicates whether the latest view moved up or down relative to the day-ahead snapshot. Demonstrate CSV export as a quick route into an existing desk workflow.

### 2:10–3:25 — Accuracy Analysis

Open **Accuracy Analysis**. Explain that the primary score uses the latest WINDFOR publication available at least 24 hours before each delivery period, matched to the FUELHH actual at the same `startTime`. In this sample, MAE is about **1,970 MW**, RMSE about **2,430 MW**, and bias is **+1,766 MW**, indicating average over-forecasting. There are **717 matched delivery periods** in the evaluation sample.

Explain the practical reading: MAE is the typical absolute miss, RMSE is more sensitive to large misses, and bias shows average direction. The chart breaks performance out by publication lead time; the scatter plot shows individual matched periods against the perfect-forecast diagonal.

### 3:25–4:25 — Decision boundary and close

“These metrics help calibrate confidence in wind, but they do not calculate the utility’s net procurement requirement. Demand, other generation, market prices, asset availability and portfolio constraints are outside this pilot’s data scope. A next phase could connect those signals, apply desk-specific decision rules, and validate the workflow with traders. For this pilot, the output is a traceable wind signal and its measured historical error.”

## Part 2 — Technical review (about 4:25)

### 0:00–0:45 — Architecture

Show the repository and explain the split: React, Vite and Recharts render the user experience; FastAPI serves the forecast, accuracy and chat endpoints; Elexon BMRS is the only generation data source. Docker Compose runs the frontend and backend, while the backend stores fetched records in a persistent file cache.

### 0:45–1:30 — Data acquisition and cache

Open `backend/services/elexon_client.py`. Show the WINDFOR and FUELHH requests, the `fuelType == WIND` filter, response-shape handling and seven-day request chunks. Forecast publications beginning 31 December are fetched so early January delivery periods can have D-1 vintages. Empty responses are not persisted, which lets a later request retry after a transient source failure.

### 1:30–2:30 — Matching and metrics

Open `backend/services/data_processor.py`. Explain UTC-normalised `startTime` joins, the day-ahead decision cutoff of `startTime - 24 hours`, and selection of the latest `publishTime` at or before that cutoff. MAE, RMSE and bias are computed from `forecast - actual`; missing pairs are excluded rather than treated as zero. Lead-time buckets are a separate analysis across available vintages. The forecast feed is hourly and FUELHH is half-hourly, so only exact timestamps present in both are evaluated.

### 2:30–3:15 — API and frontend

Show `backend/routers/forecast.py` and `backend/routers/accuracy.py`, then `frontend/src/api/client.js` and the page components. The API owns source data and metric logic; the browser owns selection, charts, sorting and CSV export. The optional assistant calls allowlisted backend tools and reuses the same cached data and calculations.

### 3:15–3:55 — Development and verification

Show `docker-compose.yml`, the Dockerfiles and `.dockerignore` files. Mention that the frontend production build succeeds, all **22 backend unit tests pass**, Compose configuration validates, and the Docker containers were built and checked through the health, forecast and accuracy endpoints. Demonstration API checks returned 24 forecast slots for 15 January and 717 matched accuracy periods.

### 3:55–4:25 — Limitations and next steps

“The data is national wind only and the historical window is January 2026. The day-ahead cutoff is a transparent pilot assumption of 24 hours before each delivery slot; a production desk should confirm the exact decision timestamp it wants to benchmark. Forecast revisions are historical records returned by Elexon, not an archived, point-in-time snapshot system we operate ourselves. The next engineering steps are source-availability monitoring, a documented refresh policy, desk validation of the cutoff, and integration of demand and the rest of the portfolio before estimating procurement.”
