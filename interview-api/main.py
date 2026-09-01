from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from guardrails.guardrails import basic_injection_check, validate_input
from schema.schemas import InterviewRequest
from services.get_answers import get_answers
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

app = FastAPI()

# Every request buys a completion, so the exposure here is cost rather than
# availability: unmetered and unauthenticated, a loop drains the OpenRouter
# balance. CORS does not help - an origin allowlist constrains browsers, and a
# script ignores it entirely.
#
# Storage defaults to in-process memory, so counters are per worker. Running
# with --workers or several containers multiplies the effective ceiling; that
# needs storage_uri="redis://..." to share state.
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins =[
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/interview")
# Per-minute stops bursts; per-day caps total spend. Neither covers requests
# that fail validation: FastAPI validates the body before the handler this
# decorator wraps, so a 422 never consumes quota. That is deliberate - a 422
# costs nothing upstream - but it means this is cost protection, not flood
# protection.
@limiter.limit("10/minute")
@limiter.limit("200/day")
# "request" is named and typed for slowapi, which finds the client by
# introspecting the signature for exactly that name. The body moves to
# "payload" to free it up.
def post_interview(request: Request, payload: InterviewRequest):
    is_valid, error_message = validate_input(payload.role)
    if not is_valid:
        raise HTTPException(status_code=422, detail=error_message)
    if basic_injection_check(payload.role):
        raise HTTPException(status_code=422, detail="Invalid input detected.")
    response = get_answers(
        payload.role,
        payload.temperature,
        payload.top_p,
        payload.frequency_penalty,
        payload.presence_penalty,
    )
    return {"response": response}
