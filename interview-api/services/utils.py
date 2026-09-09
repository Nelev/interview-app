def set_open_params(
    model="openai/gpt-4o-mini",
    temperature=0.7,
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
