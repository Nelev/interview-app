# interview-app

Enter a job title and get the ten questions you are most likely to be asked in
an interview for that role, then draft an answer to each one.

The repository is a monorepo holding two independent services:

| Directory | What it is | Stack | Dev port |
| --- | --- | --- | --- |
| [`interview-api`](interview-api) | HTTP API: validates input, builds the prompt, calls the LLM | Python 3.14, FastAPI, OpenAI SDK via OpenRouter, uv | `8000` |
| [`interview-web`](interview-web) | Single-page frontend | React 19, Vite 8, TypeScript 6, Tailwind CSS v4, shadcn/ui, TanStack Query, Zustand, Biome | `5173` |

```
interview-web  ──POST /interview {role, temperature, topP, …}──▶  interview-api  ──▶  OpenRouter
   :5173        ◀──{"response": {"questions": [{id, question}]}}──     :8000
```

The model is constrained by a JSON schema, so the reply is guaranteed to match
the `Questions` shape rather than being free text the client has to parse.

## Prerequisites

- **[uv](https://docs.astral.sh/uv/)** — manages the Python toolchain and
  virtualenv. It installs Python 3.14 itself, so you do not need it beforehand.
- **Node.js 24** and **Yarn 1.x** — the version is pinned in
  [`.nvmrc`](interview-web/.nvmrc); the lockfile is `yarn.lock`, so use Yarn
  rather than npm to avoid a second lockfile.
- **An [OpenRouter](https://openrouter.ai/) API key.**

## Setup

The two services are independent: there is no root-level package manifest and
no install step at the repository root.

### 1. interview-api

```bash
cd interview-api && uv sync
```

`uv sync` creates `.venv/`, installs the pinned dependencies from `uv.lock`, and
fetches Python 3.14 if it is not already present.

Then create `interview-api/.env`:

```bash
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

`.env` is gitignored and must never be committed. `OPENROUTER_API_KEY` is the
only environment variable the code reads. Note the OpenAI client is constructed
at import time, so **the app cannot even be imported without it** — set a
placeholder if you only want to run a smoke check.

Worth doing once: set a spend cap on the OpenRouter key. The rate limit below is
per-IP and per-process; a cap on the key is the only control that survives a bug
in this code.

### 2. interview-web

```bash
cd interview-web && yarn install
```

## Running

Both services must be running at once. Use two terminals.

### interview-api

```bash
cd interview-api && uv run python -m uvicorn main:app --reload
```

Serves on `http://127.0.0.1:8000`, with interactive docs at
[`/docs`](http://127.0.0.1:8000/docs).

> **Why `python -m uvicorn` and not `uv run fastapi dev`.** On Windows, the
> `fastapi.exe` console shim is blocked by Application Control
> (`os error 4551`), and even when it runs, its startup banner can fail to
> encode to a cp1252 console. Invoking the module goes through `python.exe` and
> sidesteps both. `PYTHONIOENCODING=utf-8` fixes the encoding half if you prefer
> the `fastapi` CLI.

### interview-web

```bash
cd interview-web && yarn dev
```

Serves on `http://localhost:5173`. The API's CORS allowlist permits exactly
`localhost:5173` and `127.0.0.1:5173`, so if Vite picks a different port because
5173 is taken, requests will be blocked until you add that origin.

## API

### `POST /interview`

The only route. Request body — camelCase on the wire, snake_case in Python; a
pydantic alias generator translates at the boundary:

```json
{
  "role": "Software Engineer",
  "temperature": 0.7,
  "topP": 1.0,
  "frequencyPenalty": 0.0,
  "presencePenalty": 0.0
}
```

Only `role` is required. Every numeric field is bounded to the range the OpenAI
API accepts, and unknown keys are rejected rather than ignored:

| Field | Min | Max | Default |
| --- | --- | --- | --- |
| `temperature` | 0.0 | 2.0 | 1.0 |
| `topP` | 0.0 | 1.0 | 1.0 |
| `frequencyPenalty` | −2.0 | 2.0 | 0.0 |
| `presencePenalty` | −2.0 | 2.0 | 0.0 |

Response:

```json
{ "response": { "questions": [ { "id": 1, "question": "…" } ] } }
```

`422` covers every rejection — a missing or out-of-range field, an unknown key,
an empty or over-long `role`, and a guardrail hit. `429` means the rate limit
was exceeded.

```bash
curl -X POST http://127.0.0.1:8000/interview \
  -H "Content-Type: application/json" \
  -d '{"role": "Software Engineer"}'
```

### Guardrails

Three layers, in [`guardrails/`](interview-api/guardrails/guardrails.py),
[`schema/`](interview-api/schema/schemas.py) and the prompt:

- **Schema bounds** reject out-of-range parameters before any paid call.
- **`validate_input`** rejects empty input and anything over 60 characters;
  **`basic_injection_check`** matches a short list of known injection phrases.
  The pattern list is easily paraphrased around — treat it as defence in depth.
- **Strict `json_schema` output** is the structural control: the model *cannot*
  return anything but the `Questions` shape, so even a successful jailbreak
  cannot produce free text.
- **Rate limiting** via `slowapi` at **10/minute** and **200/day** per client
  IP. Requests that fail validation return `422` without consuming quota, since
  FastAPI validates the body before the handler the limiter wraps. That makes
  this cost protection, not flood protection. Counters are in-process, so
  running with `--workers` multiplies the effective ceiling.

Model settings (`openai/gpt-4o-mini`, `max_tokens=1500`) are in
`set_open_params` in
[`services/get_answers.py`](interview-api/services/get_answers.py). The model
matters: `strict: true` json_schema is not supported by `gpt-3.5-turbo`.

## Frontend scripts

Run from `interview-web/`:

| Command | What it does |
| --- | --- |
| `yarn dev` | Vite dev server with HMR |
| `yarn build` | Typecheck (`tsc -b`) then production build to `dist/` |
| `yarn preview` | Serve the built `dist/` locally |
| `yarn lint` | Biome linter |
| `yarn format` | Biome formatter, writes in place |
| `yarn check:ci` | Lint + format + import order, read-only |
| `yarn check:fix` | Same, applying every safe fix |

Biome is the only linter and formatter — ESLint and Prettier are deliberately
not used. House style is tabs and double quotes, enforced by
[`biome.json`](interview-web/biome.json). `src/components/ui/**` and `public/**`
are excluded from the linter: the former is regenerated by the shadcn CLI, so
linting it means re-fixing the same findings on every update.

> The read-only check is named `check:ci`, not `check`, because Yarn 1 has a
> built-in `yarn check` command that shadows any same-named script.

## Layout

```
interview-api/
  main.py                     FastAPI app, CORS, rate limits, the one route
  const.py                    OpenRouter base URL
  schema/schemas.py           InterviewRequest, Question, Questions
  guardrails/guardrails.py    input validation and injection patterns
  prompts/                    system prompt
  services/get_answers.py     OpenRouter client, model params, completion call

interview-web/
  src/main.tsx                entry point, TanStack Query provider
  src/App.tsx                 empty / loading / error / results states
  src/api/assistant.ts        typed fetch for POST /interview
  src/model/model.ts          Question type, shared across api, store and UI
  src/store/store.ts          zustand store: questions and committed answers
  src/pages/BaseLayout.tsx    sidebar shell
  src/components/AppSidebar.tsx           sidebar with the generation form
  src/components/GenerateQuestionsForm.tsx  job title and model parameters
  src/components/QuestionCard.tsx           one question, expandable to answer
  src/components/ui/                        shadcn/ui primitives (vendored)
```

The `@` import alias maps to `interview-web/src/`, configured in both
[`vite.config.ts`](interview-web/vite.config.ts) and
[`tsconfig.app.json`](interview-web/tsconfig.app.json).

### State ownership

Three stores, deliberately separated:

- **TanStack Query** owns request lifecycle — `isPending`, `isError`.
- **Zustand** owns settled data — the questions and the answers the user has
  committed. It lives outside the React tree, so results survive the sidebar
  unmounting, which happens below 768px when it collapses into a `Sheet`.
- **Local `useState`** owns in-progress drafts. Answer text stays in the card
  until submitted, so typing performs no store writes and one card's keystrokes
  cannot re-render the others.

## CI

Two path-filtered workflows in [`.github/workflows`](.github/workflows), so a
frontend commit never triggers the backend pipeline and vice versa. Each filter
also includes its own workflow file, so a change to a pipeline validates itself.

- **Frontend** — `yarn install --frozen-lockfile`, `check:ci`, `build`, and a
  test step that activates once a `test` script exists.
- **API** — `uv sync --locked`, `compileall`, an `import main` gate that catches
  broken imports and route conflicts, and `ruff`/`pytest` steps that activate
  once either is added to `pyproject.toml`.

Neither is a required status check. Path-filtered workflows never report on a PR
that does not touch their paths, so marking them required would block such a PR
forever waiting for a status that never arrives.

## Branching

Trunk-based: `main` is the only long-lived branch. Cut a short-lived branch,
open a PR into `main`, merge, delete the branch.

## Known gaps

- **The prompt and the output schema disagree.** The prompt instructs the model
  to reply `{"error": "Job title unknown"}` for input that is not a job role,
  but `strict: true` makes that object unproducible — the schema requires
  `questions`. So an unrecognised role currently yields invented questions
  rather than a rejection.
- **Answers go nowhere.** `QuestionCard` commits to the zustand store; there is
  no endpoint to persist them, and they are lost on reload.
- The API base URL is hardcoded in
  [`src/api/assistant.ts`](interview-web/src/api/assistant.ts) and the CORS
  origins in [`main.py`](interview-api/main.py). Neither reads configuration, so
  nothing runs outside a local machine yet.
- No authentication. Rate limiting by IP is what you do when there is no
  identity to key on.
- No tests in either service, and no Python linter configured — the CI steps for
  both are wired and waiting.
- No root `.gitattributes`. On Windows, `core.autocrlf` and Biome's LF output
  disagree, so files show as modified with no content change after a branch
  switch. `* text=auto eol=lf` would settle it.
- Leftover scaffold: `src/App.css` and `src/assets/` are unreferenced, and both
  per-service READMEs are still template text.
