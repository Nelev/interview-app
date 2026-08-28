import os

from dotenv import load_dotenv
from openai import OpenAI
from prompts.questions_system_prompt import questions_system_prompt

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
)

def set_open_params(
    model="gpt-3.5-turbo",
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
    print(params)
    response = client.chat.completions.create(
        model=params["model"],
        messages=messages,
        temperature=params["temperature"],
        max_tokens=params["max_tokens"],
        top_p=params["top_p"],
        frequency_penalty=params["frequency_penalty"],
        presence_penalty=params["presence_penalty"],
        # Makes valid JSON a decoding guarantee rather than an instruction the
        # model may ignore by wrapping the reply in a markdown fence.
        response_format={"type": "json_object"},
    )
    return response


def get_answers(role: str, temperature: float, top_p: float, frequency_penalty: float, presence_penalty: float) -> str:

    params = set_open_params(
        temperature=temperature,
        top_p=top_p,
        frequency_penalty=frequency_penalty,
        presence_penalty=presence_penalty
    )

    messages = [
        {"role": "system", "content": questions_system_prompt},
        {"role": "user", "content": f"Job title: {role}"},
    ]

    response = get_completion(params, messages)
    return response.choices[0].message.content.strip()
