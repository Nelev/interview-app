import unicodedata
from typing import Annotated

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, StringConstraints, field_validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from services.get_answers import get_answers

app = FastAPI()

# Layer 5: cap request volume per client. Without this a single script can
# drain the OpenRouter balance, and no amount of input validation helps.
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


class InterviewRequest(BaseModel):
    # Layer 1: bound the input before it reaches a paid API call. The length
    # cap is the anti-abuse control; the validator below strips the invisible
    # characters used to smuggle instructions past a prompt boundary.
    role: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=2, max_length=60)
    ]

    @field_validator("role", mode="before")
    @classmethod
    def reject_invisible(cls, v):
        if not isinstance(v, str):
            return v
        # Unicode category "C*" covers control, format, surrogate, private-use
        # and unassigned code points: newlines, zero-width joiners, RTL
        # overrides. A job title never legitimately contains one.
        cleaned = "".join(ch for ch in v if not unicodedata.category(ch).startswith("C"))
        if cleaned != v:
            raise ValueError("control or formatting characters are not allowed")
        return " ".join(cleaned.split())


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
def create_interview(request: Request, payload: InterviewRequest):
    response = get_answers(payload.role)
    return {"response": response}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}
