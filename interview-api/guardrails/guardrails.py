MAX_JOB_TITLE_LENGTH = 60

# Answers are prose, so the job-title cap does not transfer. The per-answer
# limit keeps one field from dominating a prompt; the batch limit matters more,
# because ten answers reach the model in a single paid call.
MAX_ANSWER_LENGTH = 2000
MAX_TOTAL_ANSWER_LENGTH = 12000

SUSPICIOUS_PATTERNS = [
    "ignore previous instructions",
    "ignore all previous instructions",
    "reveal your system prompt",
    "reveal the system prompt",
    "forget your instructions",
]


def validate_role_input(user_input):
    if not isinstance(user_input, str):
        return False, "Input must be text."

    if not user_input.strip():
        return False, "Input cannot be empty."

    if len(user_input) > MAX_JOB_TITLE_LENGTH:
        return False, "Input is too long."

    return True, None

def validate_answer_input(user_input):
    if not isinstance(user_input, str):
        return False, "Input must be text."

    if not user_input.strip():
        return False, "Input cannot be empty."

    if len(user_input) > MAX_ANSWER_LENGTH:
        return False, "Answer is too long."

    return True, None


def validate_answer_batch(answers):
    """Guards the request as a whole, which per-answer checks cannot do."""
    if not answers:
        return False, "No answers to evaluate."

    total = sum(
        len(answer.get("answer", "")) for answer in answers if isinstance(answer, dict)
    )
    if total > MAX_TOTAL_ANSWER_LENGTH:
        return False, "Answers are too long in total."

    return True, None

def basic_injection_check(text):
    lowered = text.lower()
    return any(pattern in lowered for pattern in SUSPICIOUS_PATTERNS)
