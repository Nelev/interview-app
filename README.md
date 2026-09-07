# interview-app

Send a job title and get the ten questions you are most likely to be asked in
an interview for that role, then draft an answer to each one and have it rated
1–5 with suggested improvements.

The repository is a monorepo holding two independent services:

| Directory | What it is | Stack | Dev port |
| --- | --- | --- | --- |
| [`interview-api`](interview-api) | HTTP API: validates input, builds the prompt, calls the LLM | Python 3.14, FastAPI, OpenAI SDK via OpenRouter, uv | `8000` |
| [`interview-web`](interview-web) | Single-page frontend, chat-shaped | React 19, Vite 8, TypeScript 6, Tailwind CSS v4, shadcn/ui, TanStack Query, Zustand, Biome | `5173` |

```
interview-web  ──POST /interview {role, model, difficulty, temperature, …}──▶  interview-api  ──▶  OpenRouter
   :5173        ◀──{"response": {"questions": [{id, question}]}, "cost": 0.000255}──   :8000

               ──POST /answers   {role, answers: [{id, question, answer}]}──▶
               ◀──{"response": {"answers": [{id, rating, suggestedImprovements}]}, "cost": …}──
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

Generates the questions. Request body — camelCase on the wire, snake_case in
Python; a pydantic alias generator translates at the boundary:

```json
{
  "role": "Software Engineer",
  "model": "openai/gpt-4o-mini",
  "difficulty": "medium",
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
| `difficulty` | `easy` \| `medium` \| `hard` | | `medium` |
| `model` | any string | | `openai/gpt-4o-mini` |

`difficulty` and `model` are deliberately asymmetric. `difficulty` is a closed
`Literal`, because it is interpolated straight into the user message and is
therefore prompt surface that `basic_injection_check` never sees. `model` is an
open string, judged by OpenRouter — so a bad slug costs a round trip and
surfaces the provider's own error rather than a `422` from here.

Response:

```json
{
  "response": { "questions": [ { "id": 1, "question": "…" } ] },
  "cost": 0.000255
}
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
{
  "response": { "answers": [ { "id": 1, "rating": 4, "suggestedImprovements": "..." } ] },
  "cost": 0.00146
}
```

`rating` is an integer 1–5 against an anchored rubric in the prompt; an
unanchored scale clusters around 3.

### Cost reporting

Both routes return the cost of the call that served them. OpenRouter includes
usage on every response with no request flag needed — `usage: {include: true}`
is deprecated and has no effect — so the figure is already paid for and was
previously being discarded.

It is read defensively:

```python
call_cost = getattr(response.usage, "cost", None)
```

`cost` is an OpenRouter addition, not an OpenAI SDK field. It survives only
because the SDK sets `extra="allow"`, so attribute access works when the
provider sends it and raises `AttributeError` when it does not — on a call that
already succeeded and was billed. `None` reaches the client as `null`, which
means *unmeasured*, not free.

The frontend accumulates these into a session total shown in the sidebar footer.
An unreported cost is skipped rather than counted as zero, which makes the
displayed figure a lower bound rather than a wrong number.

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
| `basic_injection_check` | `role` and each answer | 8 known injection phrases |

The batch limit is the one that caps cost: ten answers just under the per-answer
limit would still send 20k characters in a single prompt. The messages are
plain — `Input is too long.`, `No answers to evaluate.`, `Answer is too long.`,
`Answers are too long in total.`

`basic_injection_check` is a short substring list, matched literally, and is
easily paraphrased around — `"reveal your system prompt"` is caught,
`"reveal my system prompt"` is not. Treat it as defence in depth, not a control.

**Strict `json_schema` output** is the structural control, and the only one that
does not depend on the model cooperating. The reply cannot contain anything the
schema forbids, so a jailbreak cannot produce free text. It has one consequence
worth knowing: there is no field for an error message, so the questions prompt
reports input that is not a job role by returning `{"questions": []}`, and the
frontend renders that as a distinct rejection message in the transcript.

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
protection. Counters are in-process, so running with `--workers` multiplies the
effective ceiling; sharing them needs `storage_uri="redis://..."`.

With `max_tokens=1500` capping output and the guardrails capping input, the
worst case per call is computable: roughly **$0.001** on `/interview` and
**$0.0015** on `/answers` at `gpt-4o-mini` prices, so the 200/day limit bounds
one IP at about **$0.29 a day**.

**Choosing a model** is not free either. A slug has to clear two independent
checks: it must support strict structured outputs *and* all five parameters
`get_completion` sends unconditionally — reasoning models reject the four
sampling ones, which surfaces as a `404` at request time. It also needs an
endpoint that survives the account's data policy at
[openrouter.ai/settings/privacy](https://openrouter.ai/settings/privacy);
open-weights models have no first-party host, so a strict policy can filter
every provider serving them and the router answers `no endpoints available
matching your guardrail restrictions and data policy` — also a `404`, for an
entirely unrelated reason.

## API tests

```bash
cd interview-api && uv run pytest
```

**78 tests, no network and no model calls**: `get_questions` and `get_answers`
are replaced with spies that record their arguments, so tests can assert both
what reached the service and — for every rejection path — that nothing did.

| File | Covers |
| --- | --- |
| `test_interview.py` | contract, role rules, parameter bounds, model and difficulty, alias translation, cost |
| `test_answers.py` | contract, per-answer and batch limits, camelCase response, cost |
| `test_schemas.py` | strict-mode invariants on the output schemas |
| `test_prompts.py` | prompts only ask for shapes the schemas permit |
| `test_rate_limit.py` | the limiter, in isolation |

Three of those exist to catch regressions that are invisible from reading the
code. `test_schemas.py` asserts every property is required with no defaults —
re-adding a default silently produces a `400` from the provider.
`test_prompts.py` asserts the questions prompt does not request an object the
schema forbids, which was a real bug: the instruction was dead text and the
model invented questions instead. And one test asserts a `null` cost reaches the
client as `null` rather than becoming a zero, which would read as a free call.

Both services return `(result, cost)`, so the spies return tuples. A bare model
does not fail loudly there — pydantic models iterate over their fields, so
unpacking one yields a 1-tuple and the error points at the handler rather than
the fixture.

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
    get_questions.py            completion call for /interview, returns (Questions, cost)
    get_answers.py              completion call for /answers, returns (Answers, cost)
  tests/                      pytest suite, no network

interview-web/
  src/main.tsx                entry point, TanStack Query provider
  src/App.tsx                 chat shell: scrolling transcript, composer pinned below
  src/api/assistant.ts        typed fetch for both routes, owns the mutation key
  src/model/model.ts          shared types across api, store and UI
  src/store/store.ts          zustand: transcript, questions, answers, evaluations, cost, settings
  src/pages/BaseLayout.tsx    full-height sidebar shell
  src/components/
    MessageList.tsx             renders the transcript, switching on message kind
    Composer.tsx                the message box; owns the request
    InterviewSettings.tsx       model, difficulty and the four sampling dials
    SessionCost.tsx             running session total in the sidebar footer
    QuestionCard.tsx            one question, expandable to answer, shows its rating
    EvaluateAnswersButton.tsx   sends the whole answered set
    AppSidebar.tsx              sidebar shell
    ui/                         shadcn/ui primitives (vendored)
```

The `@` import alias maps to `interview-web/src/`, configured in both
[`vite.config.ts`](interview-web/vite.config.ts) and
[`tsconfig.app.json`](interview-web/tsconfig.app.json).

### The chat UI

The main pane is a transcript with a composer pinned beneath it. Sending appends
a user turn, then an assistant turn carrying either the questions or a plain
message.

Messages are a **discriminated union**, not strings, so an assistant turn can
hold questions and render them as answerable cards rather than flattening them
into prose:

```ts
type ChatMessage =
  | { id: string; role: "user";      kind: "text"; text: string }
  | { id: string; role: "assistant"; kind: "text"; text: string }
  | { id: string; role: "assistant"; kind: "questions"; questions: Question[] };
```

**Only the newest question set stays interactive.** `QuestionCard` reads answers
and evaluations from the store by question id and the store holds one interview
at a time, so an older set would show the current interview's answers against
its own ids. Earlier sets render as a plain numbered list.

Request states are messages rather than full-pane replacements: a pending call
is a placeholder bubble, an error is a bubble, and an unrecognised role is a
bubble. Replacing the pane would hide the history being read.

Two layout details that matter. `min-h-full` has to sit on the direct child of
the sized scroll container, not a level below it, or the empty state aligns to
the top instead of centring. And the composer toggles `overflow-y` itself,
because a height set from `scrollHeight` lands a fraction of a pixel over and
the browser draws a scrollbar on content that already fits.

### Rating display

`ui/rating.tsx` renders a rating as five segments filled to the value and tinted
by it, plus the numeral. The scale runs red at 1 to green at 5 through
`--rating-1`…`--rating-5` in [`index.css`](interview-web/src/index.css), defined
for both themes.

It is its own token ramp rather than the `--chart-*` tokens, which run blue to
red for the sliders and have no green end — sharing them would mean tuning one
scale breaks the other. Five explicit stops rather than a gradient between two,
since the value is an integer and each stop needs its own lightness: amber at
the same L as red reads brighter.

Red to green is unreadable for a red-green colour blind viewer, so colour is not
the only carrier — the **filled-segment count** encodes the value too, and
lightness climbs with the rating. The class strings are written out literally
because Tailwind scans source statically and `bg-rating-${n}` generates no CSS.

### State ownership

Three stores, deliberately separated:

- **TanStack Query** owns request lifecycle — `isPending`, `isError`. The
  mutation key lives in `api/assistant.ts` so the composer, the transcript and
  the settings panel can all read the status without importing from each other.
- **Zustand** owns settled data — the transcript, the questions, the answers the
  user has committed, the evaluations returned for them, the running cost, and
  the generation settings. It lives outside the React tree, so all of it
  survives the sidebar unmounting, which happens below 768px when it collapses
  into a `Sheet`. The settings are there specifically because the controls are
  in the sidebar while the thing that sends is in the main pane. Editing an
  answer clears its evaluation: a rating for text since changed is worse than no
  rating, because it looks current.
- **Local `useState`** owns in-progress drafts — the composer's message and each
  card's answer. Both change on every keystroke, and putting either in the store
  would re-render the whole transcript per character.

## CI

Two path-filtered workflows in [`.github/workflows`](.github/workflows), so a
frontend commit never triggers the backend pipeline and vice versa. Each filter
also includes its own workflow file, so a change to a pipeline validates itself.

- **Frontend** — `yarn install --frozen-lockfile`, `check:ci`, `build`, and a
  test step that activates once a `test` script exists.
- **API** — `uv sync --locked`, `compileall`, an `import main` gate that catches
  broken imports and route conflicts, and `ruff`/`pytest` steps that activate
  once either is added to `pyproject.toml`. `pytest` is present, so that step
  runs; `ruff` is not.

Neither is a required status check. Path-filtered workflows never report on a PR
that does not touch their paths, so marking them required would block such a PR
forever waiting for a status that never arrives.

## Branching

Trunk-based: `main` is the only long-lived branch. Cut a short-lived branch,
open a PR into `main`, merge, delete the branch.

## Known gaps

- **The composer is a textarea over a one-shot endpoint.** It posts its text as
  `role`, and `/interview` takes a job title of ≤ 60 characters, so anything
  conversational comes back as an empty question list and reads as a rejection.
  The placeholder asks for a job title to set that expectation, but a message box
  invites sentences. A real conversation needs an endpoint that accepts one.
- **`AnswerRequest.answers` is `list[dict]`**, so nothing validates the inbound
  shape — a malformed payload becomes a malformed prompt rather than a `422`.
  It is also why the handler and batch guard work through `.get("answer", "")`
  instead of attribute access. Typing it with `Field(max_length=...)` would move
  the length bounds into pydantic and remove most of `validate_answer_input`.
- **Only money is reported, not tokens.** `usage` also carries
  `prompt_tokens`, `completion_tokens` and cache counts; none of it crosses the
  wire, so there is no way to see *why* a call cost what it did.
- **The OpenAI client is built at import time** in both service modules, which
  is why the app cannot be imported without a key and why `conftest.py` has to
  inject a placeholder before importing `main`. Building it lazily would remove
  both.
- **Role classification is not enforced, only requested.** The questions prompt
  asks the model to reject anything that is not a job role, but that judgement
  is the model's and is fuzzy at the edges. A hard guarantee needs a server-side
  check next to the other guardrails.
- **Nothing is persisted.** The transcript, answers and evaluations live in the
  zustand store and are lost on reload — there is no storage layer.
- The API base URL is hardcoded in
  [`src/api/assistant.ts`](interview-web/src/api/assistant.ts) and the CORS
  origins in [`main.py`](interview-api/main.py). Neither reads configuration, so
  nothing runs outside a local machine yet.
- No authentication. Rate limiting by IP is what you do when there is no
  identity to key on; it raises the cost of abuse without eliminating it.
- No frontend tests, and no Python linter configured — the CI steps for both are
  wired and activate as soon as either is added.
- Leftover scaffold: `src/App.css` and `src/assets/` are unreferenced,
  `interview-api/README.md` is empty, and `interview-web/README.md` is still the
  Vite template — including its mention of ESLint, which this project does not
  use.
