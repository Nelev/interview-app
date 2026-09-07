import os

from const import OPENAI_BASE_URL
from dotenv import load_dotenv
from openai import OpenAI
from prompts.questions_system_prompt import questions_system_prompt
from schema.schemas import Questions

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

client = OpenAI(
    base_url=OPENAI_BASE_URL,
    api_key=OPENROUTER_API_KEY,
)

def set_open_params(
    model="openai/gpt-4o-mini",
    temperature=1,
    max_tokens=1500,
    top_p=1,
    frequency_penalty=0,
    presence_penalty=0,
):
    """set openai parameters"""

    openai_params = {}

    openai_params["model"] = model
    openai_params["temperature"] = temperature
    openai_params["max_tokens"] = max_tokens
    openai_params["top_p"] = top_p
    openai_params["frequency_penalty"] = frequency_penalty
    openai_params["presence_penalty"] = presence_penalty
    return openai_params

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
                "name": "questions_response",
                "strict": True,
                "schema": Questions.model_json_schema(),
            },
        },
    )
    return response


def get_questions(
    role: str,
    model: str,
    difficulty: str,
    temperature: float,
    top_p: float,
    frequency_penalty: float,
    presence_penalty: float,
) -> Questions:

    params = set_open_params(
        model=model,
        temperature=temperature,
        top_p=top_p,
        frequency_penalty=frequency_penalty,
        presence_penalty=presence_penalty
    )

    messages = [
        {"role": "system", "content": questions_system_prompt},
        {"role": "user", "content": f"Job title: {role}, difficulty: {difficulty}"},
    ]

    response = get_completion(params, messages)
    # cost is an OpenRouter addition rather than an SDK field - it survives
    # only because the SDK allows extra keys - so a provider that omits it
    # would raise AttributeError on a call that already succeeded and was
    # billed. None means unmeasured, which is not the same as zero.
    call_cost = getattr(response.usage, "cost", None)
    questions = Questions.model_validate_json(
        response.choices[0].message.content
    )
    return questions, call_cost
