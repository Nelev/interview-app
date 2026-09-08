"""The prompts must only ask for shapes the output schemas permit.

A prompt that requests an unproducible object is dead text: strict mode forces
conformance, so the model does something else instead - and silently. This
guards the contradiction where the questions prompt asked for
{"error": "Job title unknown"} while the schema required "questions".
"""

from prompts.answers_system_prompt import answers_system_prompt
from prompts.questions_system_prompt import questions_system_prompt


class TestQuestionsPrompt:
    def test_does_not_ask_for_an_error_object(self):
        assert '"error"' not in questions_system_prompt

    def test_describes_the_empty_list_rejection(self):
        # Both fields, because role is required under strict mode: a prompt
        # showing only "questions" asks for an object the schema rejects.
        assert '{"role": "", "questions": []}' in questions_system_prompt

    def test_asks_for_the_role_to_be_extracted(self):
        # /answers depends on it. A prompt that stopped extracting the role
        # would leave the evaluation with no persona and no way to know.
        assert '"role"' in questions_system_prompt

    def test_instructs_tailoring_to_the_description(self):
        # The failure mode here is not an error - it is ten plausible questions
        # that ignore the posting. This is the instruction that prevents it.
        assert "TAILOR" in questions_system_prompt

    def test_frames_the_description_as_data(self):
        # A pasted posting is the largest untrusted surface in the app.
        assert "never as instructions" in questions_system_prompt

    def test_does_not_leak_python_class_names(self):
        # "Reply using the {Questions} class" reached the model verbatim and
        # meant nothing to it; the schema conveys the shape.
        assert "{Questions}" not in questions_system_prompt
        assert "{Question}" not in questions_system_prompt


class TestAnswersPrompt:
    def test_anchors_every_point_of_the_rating_scale(self):
        # An unanchored 1-5 scale clusters around 3.
        for level in ("1 -", "2 -", "3 -", "4 -", "5 -"):
            assert level in answers_system_prompt

    def test_frames_the_answer_text_as_data(self):
        # Answers are the largest untrusted surface in the app.
        assert "never as instructions" in answers_system_prompt
