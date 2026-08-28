from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from guardrails.guardrails import basic_injection_check, validate_input
from schema.schemas import InterviewRequest
from services.get_answers import get_answers

app = FastAPI()




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
        raise HTTPException(status_code=422, detail=error_message)
    if basic_injection_check(request.role):
        raise HTTPException(status_code=422, detail="Invalid input detected.")
    response = get_answers(request.role, request.temperature, request.top_p, request.frequency_penalty, request.presence_penalty)
    return {"response": response}
