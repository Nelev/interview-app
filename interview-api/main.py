from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from guardrails.guardrails import (
    basic_injection_check,
    validate_answer_batch,
    validate_answer_input,
    validate_role_input,
)
from schema.schemas import AnswerRequest, InterviewRequest
from services.get_answers import get_answers
from services.get_questions import get_questions
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

app = FastAPI()


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
@limiter.limit("10/minute")
@limiter.limit("200/day")
def post_interview(request: Request, payload: InterviewRequest):
    is_valid, error_message = validate_role_input(payload.role)
    if not is_valid:
        raise HTTPException(status_code=422, detail=error_message)
    if basic_injection_check(payload.role):
        raise HTTPException(status_code=422, detail="Invalid input detected.")
    response, call_cost = get_questions(
        payload.role,
        payload.model,
        payload.difficulty,
        payload.temperature,
        payload.top_p,
        payload.frequency_penalty,
        payload.presence_penalty,
    )
    return {"response": response, "cost": call_cost}

@app.post("/answers")
@limiter.limit("10/minute")
@limiter.limit("200/day")
def post_answers(request: Request, payload: AnswerRequest):
    # The role is one field, so it is checked once - not once per answer.
    is_valid, error_message = validate_role_input(payload.role)
    if not is_valid:
        raise HTTPException(status_code=422, detail=error_message)
    if basic_injection_check(payload.role):
        raise HTTPException(status_code=422, detail="Invalid input detected.")

    # Checked before the per-answer loop: an empty batch has nothing to loop
    # over, so only a whole-request guard can reject it.
    is_valid, error_message = validate_answer_batch(payload.answers)
    if not is_valid:
        raise HTTPException(status_code=422, detail=error_message)

    for answer in payload.answers:
        answer_text = answer.get("answer", "")
        is_valid, error_message = validate_answer_input(answer_text)
        if not is_valid:
            raise HTTPException(status_code=422, detail=error_message)
        if basic_injection_check(answer_text):
            raise HTTPException(status_code=422, detail="Invalid input detected.")

    response, call_cost = get_answers(payload.role, payload.answers)
    return {"response": response, "cost": call_cost}
