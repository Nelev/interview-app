import os
from datetime import datetime, timezone

from const import LOGS_DIR, OPENAI_BASE_URL
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


# One log file per run, so runs can be compared instead of overwriting each other.
stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
LOG_PATH = LOGS_DIR / f"questions_evaluation_{stamp}.txt"
LOGS_DIR.mkdir(parents=True, exist_ok=True)

with LOG_PATH.open("w", encoding="utf-8") as log:
    for test_case in TEST_CASES:
        test_response, cost = get_questions(
            test_case["job"],
            "openai/gpt-4o-mini",
            test_case["difficulty"],
            0.7,
            1,
            0.2,
            0.2,
        )

        # get_questions returns a Questions model, and both the judge and the
        # log need text. Numbered lines rather than the pydantic repr, and an
        # explicit marker for the empty set the REJECT cases expect - a blank
        # section would read to the judge as a missing response rather than a
        # deliberate refusal.
        questions_text = "\n".join(
            f"{question.id}. {question.question}"
            for question in test_response.questions
        )
        response_text = (
            f"Role read from the input: {test_response.role or '(none)'}\n"
            f"{questions_text or '(no questions returned)'}"
        )

        judge_output = evaluate_response(
            test_case["job"], response_text, test_case["key_aspects"]
        )

        log.write(f"Job: {test_case['job']}\n")
        log.write(f"Difficulty: {test_case['difficulty']}\n")
        log.write(f"Cost: {cost if cost is not None else 'unmeasured'}\n")
        log.write(f"\n--- Response ---\n{response_text}\n")
        log.write(f"\n--- Judge Output ---\n{judge_output}\n\n")
