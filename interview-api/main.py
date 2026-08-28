from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from guardrails.guardrails import basic_injection_check, validate_input
from pydantic import BaseModel
from services.get_answers import get_answers

app = FastAPI()

class InterviewRequest(BaseModel):
    role: str


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
def post_interview(request: InterviewRequest):
    is_valid, error_message = validate_input(request.role)
    if not is_valid:
        return {"response": [error_message]}
    if basic_injection_check(request.role):
        return {"response": ["Invalid input detected."]}
    response = get_answers(request.role)
    return {"response": response}