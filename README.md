# interview-app

A job-interview question generator. Enter a job title, and an LLM returns the
questions you are most likely to be asked for that role.

The repository is a monorepo holding two independent services:

| Directory | What it is | Stack | Dev port |
| --- | --- | --- | --- |
| [`interview-api/`](interview-api) | HTTP API that builds the prompt and calls the LLM | Python 3.14, FastAPI, OpenAI SDK via OpenRouter, uv | `8000` |
| [`interview-web/`](interview-web) | Single-page frontend | React 19, Vite 8, TypeScript 6, Tailwind CSS v4, shadcn/ui, TanStack Query, Biome | `5173` |

The frontend POSTs a job title to the API; the API templates it into a system
prompt, forwards that to the model, and returns the generated text.

```
interview-web  ──POST /interview {"role": "..."}──▶  interview-api  ──▶  OpenRouter
   :5173                                                :8000
```

## Prerequisites

- **[uv](https://docs.astral.sh/uv/)** — manages the Python toolchain and
  virtualenv. It installs Python 3.14 itself, so you do not need it beforehand.
- **Node.js 20+** and **Yarn 1.x** — the frontend is committed with a
  `yarn.lock`, so use Yarn rather than npm to avoid a second lockfile.
- **An [OpenRouter](https://openrouter.ai/) API key** — the API will not answer
  requests without one.

## Setup

Clone, then set up each service. They are independent: there is no root-level
package manifest and no install step at the repository root.

### 1. interview-api

```bash
cd interview-api && uv sync
```

`uv sync` creates `.venv/`, installs the pinned dependencies from `uv.lock`, and
fetches Python 3.14 if it is not already present.

Then create `interview-api/.env` with your OpenRouter key:

```bash
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

`.env` is gitignored and must never be committed. `OPENROUTER_API_KEY` is the
only environment variable the code reads
([`services/get_answers.py`](interview-api/services/get_answers.py)); without it
the OpenAI client is constructed with `api_key=None` and every request fails.

### 2. interview-web

```bash
cd interview-web && yarn install
```

## Running

Both services must be running at the same time. Use two terminals.

### interview-api

```bash
cd interview-api && uv run uvicorn main:app --reload
```

Serves on `http://127.0.0.1:8000`, with interactive API docs at
[`/docs`](http://127.0.0.1:8000/docs).

> **Windows note.** The alternative `uv run fastapi dev main.py` crashes on
> Windows with `UnicodeEncodeError: 'charmap' codec can't encode characters` —
> the FastAPI CLI's startup banner cannot be encoded to the console's cp1252
> codepage. Either use the `uvicorn` command above, or force UTF-8 output:
>
> ```bash
> PYTHONIOENCODING=utf-8 uv run fastapi dev main.py
> ```

### interview-web

```bash
cd interview-web && yarn dev
```

Serves on `http://localhost:5173`. The API's CORS allowlist
([`main.py`](interview-api/main.py)) permits exactly `localhost:5173` and
`127.0.0.1:5173`, so if Vite picks a different port because 5173 is taken,
requests will be blocked until you add that origin.

## API

### `POST /interview`

Request body:

```json
{ "role": "software engineer" }
```

Response:

```json
{ "response": "...generated interview questions..." }
```

`role` is required and must be a string. A missing or wrong-typed field returns
`422` with FastAPI's validation detail:

```bash
curl -X POST http://127.0.0.1:8000/interview \
  -H "Content-Type: application/json" \
  -d '{"role": "software engineer"}'
```

The prompt template lives in
[`prompts/system_prompt.py`](interview-api/prompts/system_prompt.py); the literal
marker `***field***` is substituted with the submitted role. Model settings
(currently `gpt-3.5-turbo`, `temperature=0.7`, `max_tokens=256`) are in
`set_open_params` in
[`services/get_answers.py`](interview-api/services/get_answers.py).

### `GET /items/{item_id}`

Leftover scaffolding from the FastAPI tutorial. Unused by the frontend; safe to
delete.

## Frontend scripts

Run from `interview-web/`:

| Command | What it does |
| --- | --- |
| `yarn dev` | Vite dev server with HMR |
| `yarn build` | Typecheck (`tsc -b`) then production build to `dist/` |
| `yarn preview` | Serve the built `dist/` locally |
| `yarn lint` | Biome linter |
| `yarn format` | Biome formatter, writes in place |
| `yarn check:ci` | Lint + format + import-order check, read-only |
| `yarn check:fix` | Same, applying every safe fix |

Biome is the only linter and formatter — ESLint and Prettier are deliberately
not used. House style is tabs and double quotes, enforced by
[`biome.json`](interview-web/biome.json).

> The read-only check is named `check:ci`, not `check`, because Yarn 1 has a
> built-in `yarn check` command that shadows any same-named script.

`yarn check:ci` currently exits non-zero on three known findings: the
`noSvgWithoutTitle` rule firing on the two static files in `public/`, and a
`noNonNullAssertion` warning on the standard Vite root-element lookup in
`src/main.tsx`.

## Layout

```
interview-api/
  main.py                     FastAPI app, CORS, routes, request models
  prompts/system_prompt.py    prompt template ("***field***" placeholder)
  services/get_answers.py     OpenRouter client, model params, completion call
  pyproject.toml / uv.lock    dependencies

interview-web/
  src/main.tsx                entry point, TanStack Query provider
  src/App.tsx                 job-title form
  src/api/assistant.ts        fetch wrapper for POST /interview
  src/pages/BaseLayout.tsx    page shell (header + main)
  src/components/Header/      site header
  src/components/ui/          shadcn/ui primitives (Button, Input)
  src/lib/utils.ts            cn() class-merge helper
  components.json             shadcn/ui config
```

The `@` import alias maps to `interview-web/src/`, configured in both
[`vite.config.ts`](interview-web/vite.config.ts) and
[`tsconfig.app.json`](interview-web/tsconfig.app.json).

## Branching

`main` is the release branch. `develop` is the integration branch. Cut feature
branches from `develop`, PR back into `develop`, and merge `develop` into `main`
for a release.

## Known gaps

- The API base URL is hardcoded to `http://localhost:8000` in
  [`src/api/assistant.ts`](interview-web/src/api/assistant.ts), and the CORS
  origins are hardcoded in [`main.py`](interview-api/main.py). Neither reads
  configuration, so nothing runs outside a local machine yet.
- The frontend only `console.log`s the response; nothing is rendered.
- The prompt requests "a JSON array, with each question with a key and the value
  as the question" — an array and a keyed object are different shapes — and no
  `response_format` is set, so the model's output structure is not guaranteed.
- `max_tokens=256` is likely too low for ten questions of JSON and will truncate.
- `python-dotenv` is imported directly but not declared in `pyproject.toml`; it
  currently resolves transitively through `fastapi[standard]`.
- No tests and no CI in either service.
