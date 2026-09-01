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

               ──POST /answers   {role, answers: [{id, question, answer}]}──▶
               ◀──{"response": {"answers": [{id, rating, suggestedImprovements}]}}──
```

Both calls are constrained by a JSON schema with `strict: true`, so a reply is
guaranteed to match the declared shape rather than being free text the client
has to parse. That is also the strongest guardrail in the app: even a
successful prompt injection cannot produce output the schema forbids.

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

There are two routes. Both are rate limited and both reject invalid input with
`422` before any paid call is made.

### `POST /interview`

Generates the questions. Request body — camelCase on the wire, snake_case in Python; a
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

### `POST /answers`

Evaluates the answers the user has drafted. One request covers the whole set, so
ten answers cost one call against the rate limit rather than ten.

```json
{
  "role": "Software Engineer",
  "answers": [
    { "id": 1, "question": "Explain the GIL.", "answer": "..." }
  ]
}
```

The question travels with each answer: an assessment of an answer is meaningless
without the question it answers.

Response — the answer text is deliberately not echoed back, since the client
already holds it keyed by `id`:

```json
{ "response": { "answers": [ { "id": 1, "rating": 4, "suggestedImprovements": "..." } ] } }
```

`rating` is an integer 1–5 against an anchored rubric in the prompt; an
unanchored scale clusters around 3.

### Guardrails

Four layers, in [`guardrails/`](interview-api/guardrails/guardrails.py),
[`schema/`](interview-api/schema/schemas.py), the prompts, and the rate limiter.

**Schema bounds** reject out-of-range parameters before any paid call, and
`extra="forbid"` turns a misspelled key into a `422` rather than a silently
ignored field.

**Input validation** is per-field, because the limits differ by kind:

| Check | Applies to | Limit |
| --- | --- | --- |
| `validate_role_input` | `role` on both routes | non-empty, ≤ 60 chars |
| `validate_answer_input` | each answer | non-empty, ≤ 2000 chars |
| `validate_answer_batch` | the request as a whole | non-empty list, ≤ 12000 chars total |
| `basic_injection_check` | `role` and each answer | known injection phrases |

The batch limit is the one that caps cost: ten answers just under the per-answer
limit would still send 20k characters in a single prompt. The messages are
plain — `Input is too long.`, `No answers to evaluate.`, `Answer is too long.`,
`Answers are too long in total.`

`basic_injection_check` is a short substring list and is easily paraphrased
around. Treat it as defence in depth, not a control.

**Strict `json_schema` output** is the structural control, and the only one that
does not depend on the model cooperating. The reply cannot contain anything the
schema forbids, so a jailbreak cannot produce free text. It has one consequence
worth knowing: there is no field for an error message, so the questions prompt
reports input that is not a job role by returning `{"questions": []}`, and the
frontend renders a distinct rejected state for it.

**Rate limiting** via `slowapi` at **10/minute** and **200/day** per client IP on
each route. Which rejections consume quota depends on where they happen, and the
distinction is easy to get wrong:

- **Schema rejections never consume it.** FastAPI validates the body before the
  handler the limiter wraps, so an unknown key or an out-of-range parameter
  returns `422` without touching the limiter — fifteen in a row all return `422`.
- **Guardrail rejections do consume it.** `validate_role_input` and friends run
  *inside* the handler, so the limiter has already counted the request. Ten
  whitespace-only roles return `422`, the eleventh returns `429`.

Either way no paid call is made, so this is cost protection rather than flood
protection. Counters are in-process, so
running with `--workers` multiplies the effective ceiling; sharing them needs
`storage_uri="redis://..."`.

Model settings (`openai/gpt-4o-mini`, `max_tokens=1500`) are in `set_open_params`
in each service module. The model matters: `strict: true` json_schema is not
supported by `gpt-3.5-turbo`, and reasoning models reject `temperature`, `top_p`
and both penalties — asking for them yields a `404` with no eligible endpoint.

## API tests

```bash
cd interview-api && uv run pytest
```

63 tests, no network and no model calls: `get_questions` and `get_answers` are
replaced with spies that record their arguments, so tests can assert both what
reached the service and — for every rejection path — that nothing did.

| File | Covers |
| --- | --- |
| `test_interview.py` | contract, role rules, parameter bounds, alias translation |
| `test_answers.py` | contract, per-answer and batch limits, camelCase response |
| `test_schemas.py` | strict-mode invariants on the output schemas |
| `test_prompts.py` | prompts only ask for shapes the schemas permit |
| `test_rate_limit.py` | the limiter, in isolation |

Two of those exist to catch regressions that are invisible from reading the code.
`test_schemas.py` asserts every property is required with no defaults — re-adding
a default silently produces a `400` from the provider. `test_prompts.py` asserts
the questions prompt does not request an object the schema forbids, which was a
real bug: the instruction was dead text and the model invented questions instead.

The limiter is disabled for the rest of the suite. `TestClient` presents one
client IP, so the eleventh request of a session would `429` on whichever test
happened to run then.

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
  main.py                     FastAPI app, CORS, rate limits, both routes
  const.py                    OpenRouter base URL
  schema/schemas.py           InterviewRequest, Question(s), AnswerRequest, Answer(s)
  guardrails/guardrails.py    per-field validation and injection patterns
  prompts/
    questions_system_prompt.py  generates the questions
    answers_system_prompt.py    assesses the answers
  services/
    get_questions.py            completion call for /interview
    get_answers.py              completion call for /answers
  tests/                      pytest suite, no network

interview-web/
  src/main.tsx                entry point, TanStack Query provider
  src/App.tsx                 empty / loading / error / rejected / results states
  src/api/assistant.ts        typed fetch for both routes
  src/model/model.ts          shared types across api, store and UI
  src/store/store.ts          zustand: questions, answers, evaluations
  src/pages/BaseLayout.tsx    sidebar shell
  src/components/AppSidebar.tsx              sidebar containing the form
  src/components/GenerateQuestionsForm.tsx   job title and model parameters
  src/components/QuestionCard.tsx            one question, expandable to answer
  src/components/EvaluateAnswersButton.tsx   sends the whole answered set
  src/components/ui/                         shadcn/ui primitives (vendored)
```

The `@` import alias maps to `interview-web/src/`, configured in both
[`vite.config.ts`](interview-web/vite.config.ts) and
[`tsconfig.app.json`](interview-web/tsconfig.app.json).

### State ownership

Three stores, deliberately separated:

- **TanStack Query** owns request lifecycle — `isPending`, `isError`.
- **Zustand** owns settled data — the questions, the answers the user has
  committed, and the evaluations returned for them, each keyed by question id.
  It lives outside the React tree, so results survive the sidebar unmounting,
  which happens below 768px when it collapses into a `Sheet`. Editing an answer
  clears its evaluation: a rating for text since changed is worse than no
  rating, because it looks current.
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

- **`AnswerRequest.answers` is `list[dict]`**, so nothing validates the inbound
  shape — a malformed payload becomes a malformed prompt rather than a `422`.
  It is also why the handler and batch guard work through `.get("answer", "")`
  instead of attribute access. Typing it with `Field(max_length=...)` would move
  the length bounds into pydantic and remove most of `validate_answer_input`.
- **Role classification is not enforced, only requested.** The questions prompt
  asks the model to reject anything that is not a job role, but that judgement
  is the model's and is fuzzy at the edges. A hard guarantee needs a server-side
  check next to the other guardrails.
- **Evaluations are not persisted.** They live in the zustand store and are lost
  on reload, as are the answers themselves — there is no storage layer.
- The API base URL is hardcoded in
  [`src/api/assistant.ts`](interview-web/src/api/assistant.ts) and the CORS
  origins in [`main.py`](interview-api/main.py). Neither reads configuration, so
  nothing runs outside a local machine yet.
- No authentication. Rate limiting by IP is what you do when there is no
  identity to key on; it raises the cost of abuse without eliminating it.
- No frontend tests, and no Python linter configured — the CI steps for both are
  wired and activate as soon as either is added.
- Leftover scaffold: `src/App.css` and `src/assets/` are unreferenced, and both
  per-service READMEs are still template text.
