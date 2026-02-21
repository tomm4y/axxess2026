# Live medical transcription backend (Deepgram)

Minimal feature-based layout:
- `index.ts`: server bootstrap (Express + WS)
- `s2tRoutes.ts`: REST routes
- `s2tController.ts`: request handlers + validation
- `s2tService.ts`: session store + Deepgram streaming + WS runtime

## Setup
```bash
cd axxess2026/backend
npm install

# create axxess2026/backend/.env with:
#   DEEPGRAM_API_KEY=...

npm run dev:s2t
```

HTTP: `http://localhost:3001`  
WS: returned as `wsUrl` from `POST /api/sessions`

## Quick test
```bash
curl -s -X POST http://localhost:3001/api/sessions
```

Then open `s2t/examples/browser-client.html` and paste the `wsUrl`.

