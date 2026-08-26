import os

from dotenv import load_dotenv
from openai import OpenAI
from prompts.system_prompt import system_prompt

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
)

def set_open_params(
    model="gpt-3.5-turbo",
    temperature=1,
    max_tokens=256,
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
    )
    return response


def get_answers(role: str) -> str:

    params = set_open_params(temperature=0.7)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Job title: {role}"},
    ]

    response = get_completion(params, messages)
    return response.choices[0].message.content.strip()
