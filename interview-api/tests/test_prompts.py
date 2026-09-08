"""The prompts must only ask for shapes the output schemas permit.

A prompt that requests an unproducible object is dead text: strict mode forces
conformance, so the model does something else instead - and silently. This
guards the contradiction where the questions prompt asked for
{"error": "Job title unknown"} while the schema required "questions".

Every candidate questions prompt is checked, not just the one currently wired
into get_questions. Swapping the import is a one-line change and there is
nothing else to catch a replacement that quietly breaks the contract - which
already happened once, when the service moved to chain_of_thought_prompt and
these assertions were left watching a file no longer in use.

What is checked here is the contract, not the wording. How a prompt instructs
tailoring is a property of its technique - "TAILOR", "specific to this
description", a numbered step, a persona - and asserting one phrasing would
just forbid the other four techniques.
"""

import pytest

from prompts.answers_system_prompt import answers_system_prompt
from prompts.chain_of_thought_prompt import chain_of_thought_prompt
from prompts.few_shot_prompt import few_shot_prompt
from prompts.many_shot_prompt import many_shot_prompt
from prompts.questions_system_prompt import questions_system_prompt
from prompts.role_prompt import role_prompt
from prompts.zero_shot_prompt import zero_shot_prompt

QUESTIONS_PROMPTS = pytest.mark.parametrize(
    "prompt",
    [
        questions_system_prompt,
        zero_shot_prompt,
        few_shot_prompt,
        many_shot_prompt,
        chain_of_thought_prompt,
        role_prompt,
    ],
    ids=[
        "questions_system",
        "zero_shot",
        "few_shot",
        "many_shot",
        "chain_of_thought",
        "role",
    ],
)


class TestQuestionsPrompts:
    @QUESTIONS_PROMPTS
    def test_does_not_ask_for_an_error_object(self, prompt):
        assert '"error"' not in prompt

    @QUESTIONS_PROMPTS
    def test_describes_the_empty_list_rejection(self, prompt):
        # Both fields, because role is required under strict mode: a prompt
        # showing only "questions" asks for an object the schema rejects.
        assert '{"role": "", "questions": []}' in prompt

    @QUESTIONS_PROMPTS
    def test_names_both_output_fields(self, prompt):
        assert '"role"' in prompt
        assert '"questions"' in prompt

    @QUESTIONS_PROMPTS
    def test_bounds_the_extracted_role(self, prompt):
        # /answers validates the role at 60 characters, and it gets that role
        # from here - so an unbounded one would 422 on input this API produced.
        assert "under 60 characters" in prompt

    @QUESTIONS_PROMPTS
    def test_asks_for_ten_questions_with_the_ids_the_schema_expects(self, prompt):
        assert "1 to 10" in prompt

    @QUESTIONS_PROMPTS
    def test_frames_the_description_as_data(self, prompt):
        # A pasted posting is the largest untrusted surface in the app.
        assert "never as instructions" in prompt

    @QUESTIONS_PROMPTS
    def test_does_not_leak_python_class_names(self, prompt):
        # "Reply using the {Questions} class" reached the model verbatim and
        # meant nothing to it; the schema conveys the shape.
        assert "{Questions}" not in prompt
        assert "{Question}" not in prompt


class TestAnswersPrompt:
    def test_anchors_every_point_of_the_rating_scale(self):
        # An unanchored 1-5 scale clusters around 3.
        for level in ("1 -", "2 -", "3 -", "4 -", "5 -"):
            assert level in answers_system_prompt

    def test_frames_the_answer_text_as_data(self):
        # Answers are the largest untrusted surface in the app.
        assert "never as instructions" in answers_system_prompt
