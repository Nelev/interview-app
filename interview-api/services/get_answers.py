import os

from const import OPENAI_BASE_URL
from dotenv import load_dotenv
from openai import OpenAI
from prompts.answers_system_prompt import ANSWERS_SYSTEM_PROMPT
from schema.schemas import Answers
from services.utils import set_open_params

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

client = OpenAI(
    base_url=OPENAI_BASE_URL,
    api_key=OPENROUTER_API_KEY,
)

def get_completion(params, messages):
    """GET completion from openai api"""
    response = client.chat.completions.create(
        model=params["model"],
        messages=messages,
        temperature=params["temperature"],
        max_tokens=params["max_tokens"],
        top_p=params["top_p"],
        frequency_penalty=params["frequency_penalty"],
        presence_penalty=params["presence_penalty"],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "answers_response",
                "strict": True,
                "schema": Answers.model_json_schema(),
            },
        },
    )
    return response


def get_answers(role: str, answers: list) -> tuple[Answers, float | None]:

    params = set_open_params()
    messages = [
        {"role": "system", "content": ANSWERS_SYSTEM_PROMPT},
        {"role": "user", "content": f"Job title: {role}, Answers: {answers}"},
    ]

    response = get_completion(params, messages)
    # cost is an OpenRouter addition rather than an SDK field - it survives
    # only because the SDK allows extra keys - so a provider that omits it
    # would raise AttributeError on a call that already succeeded and was
    # billed. None means unmeasured, which is not the same as zero.
    call_cost = getattr(response.usage, "cost", None)
    output_answers = Answers.model_validate_json(
        response.choices[0].message.content
    )
    return output_answers, call_cost
