import os

from const import OPENAI_BASE_URL
from dotenv import load_dotenv
from openai import OpenAI
from prompts.judge_prompt import JUDGE_PROMPT
from services.get_questions import get_questions
from test_sets.interview_test_cases import TEST_CASES

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
MODEL = "openai/gpt-5-mini"

client = OpenAI(
    base_url=OPENAI_BASE_URL,
    api_key=OPENROUTER_API_KEY,
)

def evaluate_response(job: str, response: str, key_aspects: str) -> str:
    """Use the LLM judge to evaluate a chatbot response."""
    prompt = JUDGE_PROMPT.format(
        job=job,
        key_aspects=key_aspects,
        response=response,
    )
    result = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
    )
    return result.choices[0].message.content

for test_case in TEST_CASES:

    test_response = get_questions(
        test_case["job"],
        "openai/gpt-4o-mini",
        test_case["difficulty"],
        0.7,
        1,
        0.2,
        0.2,
    )

    print("Question:", test_case["job"])
    print("\nResponse (first 300 chars):")
    print(test_response[:300], "...")

    judge_output = evaluate_response(
        test_case["job"], test_response, test_case["key_aspects"]
    )
    print("\n--- Judge Output ---")
    print(judge_output)

