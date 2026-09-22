# Somi — AI Nutrition & Diet Assistant Backend

A **stateless** Node.js + Express backend that powers "Somi", an AI nutrition assistant.
There is **no database, no auth, and no server-side user state**. All user data (profile,
meal history, resolved nutrition cache) lives in the client's `localStorage`/`sessionStorage`.
This backend exists purely to proxy two Groq-powered capabilities:

1. **Voice → text** transcription (Whisper)
2. **Meal text → structured nutrition/medical JSON** (LLaMA 3.3 70B)

---

## 1. Requirements

- Node.js 18+
- A [Groq](https://console.groq.com/) API key

## 2. Setup

```bash
cd somi-backend
npm install
cp .env.example .env
# edit .env and set GROQ_API_KEY=...
npm start
# or, for auto-reload during development:
npm run dev
```

Server boots on `http://localhost:5000` by default (configurable via `PORT`).

### Environment variables

| Variable         | Description                                         | Default                  |
|-------------------|------------------------------------------------------|---------------------------|
| `GROQ_API_KEY`    | Your Groq API key (required)                         | —                          |
| `PORT`            | Port the server listens on                           | `5000`                    |
| `ALLOWED_ORIGIN`  | CORS-allowed origin for your frontend                | `http://localhost:5173`   |

---

## 3. Endpoints

### `GET /health`

Simple liveness check.

```bash
curl http://localhost:5000/health
```

```json
{ "success": true, "status": "ok", "service": "somi-nutrition-backend" }
```

---

### `POST /api/transcribe`

Converts a voice recording to Hinglish/English text via Groq's `whisper-large-v3`.

- **Content-Type:** `multipart/form-data`
- **Field:** `audio` (max 10MB; audio files only)
- **Optional field:** `language` (ISO-639-1 code, e.g. `en`). Defaults to `hi`.

**Example request:**

```bash
curl -X POST http://localhost:5000/api/transcribe \
  -F "audio=@sample_meal_note.webm" \
  -F "language=hi"
```

**Example response:**

```json
{
  "success": true,
  "transcript": "maine do roti aur ek katori dal khayi"
}
```

**On failure** (e.g. Groq is rate-limiting or unreachable), the client gets a `503` with a
friendly retry message — raw SDK errors are never leaked:

```json
{ "success": false, "error": "We could not transcribe that audio right now. Please try again in a moment." }
```

---

### `POST /api/analyze-meal`

Takes free-text meal description + the user's profile (both supplied by the client from its
own localStorage) and returns a structured nutrition + clinical-risk JSON payload.

- **Content-Type:** `application/json`

**Request body:**

```json
{
  "meal_text": "2 roti aur 1 katori dal",
  "user_profile": {
    "age": 28,
    "gender": "male",
    "height_cm": 175,
    "weight_kg": 82,
    "activity_level": "moderate",
    "goal": "weight_loss",
    "target_calories": 1800,
    "conditions": ["type_2_diabetes", "hypertension"]
  },
  "known_items": ["roti_wheat"]
}
```

- `meal_text` is **required** and must be a non-empty string (≤ 500 chars after sanitization).
- `user_profile` is optional but recommended — without it, clinical flags can't be personalized.
- `known_items` (optional) tells the model which foods the client has *already* resolved
  locally, so it doesn't need to re-derive full catalog entries for them. See the **client
  caching contract** below — ideally the client filters these tokens out of `meal_text`
  entirely before calling this route.

**Example request:**

```bash
curl -X POST http://localhost:5000/api/analyze-meal \
  -H "Content-Type: application/json" \
  -d '{
    "meal_text": "2 roti aur 1 katori dal",
    "user_profile": {
      "age": 28,
      "gender": "male",
      "height_cm": 175,
      "weight_kg": 82,
      "activity_level": "moderate",
      "goal": "weight_loss",
      "target_calories": 1800,
      "conditions": ["type_2_diabetes", "hypertension"]
    },
    "known_items": []
  }'
```

**Example response (shape; values illustrative):**

```json
{
  "parsed_items": [
    {
      "food_name": "Roti (Wheat)",
      "matched_category": "grain",
      "entered_quantity": "2 pieces",
      "estimated_weight_g": 70,
      "calories": 210,
      "macros": { "protein_g": 6, "carbs_g": 42, "fats_g": 2, "fiber_g": 5 },
      "micros": { "sodium_mg": 5, "sugar_g": 0 },
      "glycemic_index_estimate": "MEDIUM"
    },
    {
      "food_name": "Dal (Yellow Lentil)",
      "matched_category": "legume",
      "entered_quantity": "1 katori",
      "estimated_weight_g": 150,
      "calories": 120,
      "macros": { "protein_g": 8, "carbs_g": 18, "fats_g": 2, "fiber_g": 4 },
      "micros": { "sodium_mg": 300, "sugar_g": 1 },
      "glycemic_index_estimate": "LOW"
    }
  ],
  "meal_totals": {
    "total_calories": 330,
    "total_protein_g": 14,
    "total_carbs_g": 60,
    "total_fats_g": 4,
    "total_fiber_g": 9,
    "total_sodium_mg": 305,
    "total_sugar_g": 1
  },
  "catalog_additions": [
    {
      "key_identifier": "roti_wheat",
      "aliases": ["roti", "chapati", "phulka"],
      "serving_type": "unit_based",
      "base_unit": "1_piece",
      "base_calories": 105,
      "base_protein_g": 3,
      "base_carbs_g": 21,
      "base_fats_g": 1,
      "base_fiber_g": 2.5,
      "base_sodium_mg": 2.5
    }
  ],
  "medical_flags": [
    {
      "severity": "CAUTION",
      "target_condition": "type_2_diabetes",
      "trigger_item": "Roti (Wheat)",
      "clinical_reason": "Refined-adjacent carb load can trigger a glucose spike if eaten alone.",
      "mitigation_action": "Pair with extra dal or a protein source to slow glucose absorption."
    }
  ],
  "commerce_and_goal_insights": {
    "bio_score": 78,
    "goal_verdict": "Aligned with weight-loss goal; moderate calorie density.",
    "smart_swaps": [
      { "original_food": "Roti (Wheat)", "recommended_swap": "Multigrain roti", "benefit": "Higher fiber, lower glycemic impact" }
    ],
    "macro_gap_filler": "Consider adding a lean protein source to reach your daily target."
  }
}
```

**Error cases:**

| Condition                                   | Status | Body                                                              |
|----------------------------------------------|--------|--------------------------------------------------------------------|
| Missing/empty `meal_text`                     | `400`  | `{ "success": false, "error": "\"meal_text\" is required..." }`   |
| Groq returns `429` (rate limited)             | `503`  | `{ "error": "Engine busy, retry shortly" }`                       |
| Model output can't be parsed as JSON (after 1 retry) | `502`  | `{ "success": false, "error": "The nutrition engine returned an unexpected response..." }` |
| Any other upstream failure                    | `503`  | `{ "success": false, "error": "We could not analyze that meal right now..." }` |

---

## 4. Client-side caching contract

This backend is designed to be called **as little as possible**. The client is expected to
own a `nutrition_master_catalog` object in `localStorage`, structured as a dictionary keyed by
`key_identifier` (see `catalog_additions` in the response schema above).

**Recommended client flow:**

1. Before calling `/api/analyze-meal`, tokenize the raw meal text (lowercase, trim, singularize)
   and match tokens against the aliases already present in `nutrition_master_catalog`.
2. For matched tokens, compute nutrition totals **locally** via simple multiplier math
   (`quantity × base_unit values`) — do **not** send these to the API.
3. Send only the unresolved/unmatched portion of the meal text as `meal_text`. You may also
   pass the identifiers you've already resolved in `known_items` purely for model context.
4. On response, merge `catalog_additions` into your local `nutrition_master_catalog` so future
   mentions of the same food are resolved with **zero** API calls.

This keeps steady-state Groq spend low — new/unusual foods hit the model, but a user's
recurring staples (roti, dal, rice, etc.) get resolved instantly and for free after the first
encounter.

---

## 5. Project structure

```
/src
  /routes
    transcribe.route.js       # POST /api/transcribe
    analyzeMeal.route.js      # POST /api/analyze-meal
  /controllers
    transcribe.controller.js
    analyzeMeal.controller.js
  /services
    groqClient.js             # shared Groq SDK instance
    whisperService.js         # Whisper transcription wrapper
    llamaService.js           # LLaMA chat completion wrapper
  /prompts
    somiSystemPrompt.js       # full Somi system prompt + retry reminder
  /middleware
    errorHandler.js
    validateRequest.js
    rateLimiter.js
  /utils
    sanitizeInput.js
    jsonSafeParse.js
  server.js
.env.example
```

## 6. Security notes

- `helmet()` sets standard security headers.
- `cors()` is locked to `ALLOWED_ORIGIN` — update this for your deployed frontend's domain.
- Both routes are rate-limited to 20 requests/minute/IP via `express-rate-limit` to bound
  Groq spend under abuse or bugs.
- `meal_text` is sanitized (HTML/script tags stripped, length capped at 500 chars) before
  being interpolated into the LLM prompt, as defense against prompt injection.
- Audio uploads use `multer.memoryStorage()` — files are never written to disk and are
  discarded after the request completes.
- The global error handler never leaks stack traces to the client in production
  (`NODE_ENV=production`).
