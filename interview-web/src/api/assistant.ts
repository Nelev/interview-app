import type {
	AnswerResponse,
	AnswersApiResponse,
	InterviewApiResponse,
	InterviewParameters,
	Question,
	SubmittedAnswer,
} from "@/model/model";

const API_BASE_URL = "http://localhost:8000";
const API_URL = `${API_BASE_URL}/interview`;
const ANSWERS_URL = `${API_BASE_URL}/answers`;

const postInterview = async (
	parameters: InterviewParameters,
): Promise<{ questions: Question[]; cost: number }> => {
	const response = await fetch(API_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ ...parameters }),
	});

	if (!response.ok) {
		throw new Error(`Failed to post interview (${response.status})`);
	}

	const data = (await response.json()) as InterviewApiResponse;
	return { questions: data.response.questions, cost: data.cost };
};

const postAnswers = async (payload: {
	role: string;
	answers: SubmittedAnswer[];
}): Promise<{ evaluations: AnswerResponse[]; cost: number }> => {
	const response = await fetch(ANSWERS_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw new Error(`Failed to evaluate answers (${response.status})`);
	}

	const data = (await response.json()) as AnswersApiResponse;
	const evaluations = data.response?.answers;

	if (!Array.isArray(evaluations)) {
		throw new Error(
			"Unexpected response shape from /answers: expected { response: { answers: [...] } }",
		);
	}

	const sent = new Set(payload.answers.map((answer) => answer.id));
	const returned = new Set(evaluations.map((evaluation) => evaluation.id));
	const missing = [...sent].filter((id) => !returned.has(id));

	if (missing.length > 0 || returned.size !== sent.size) {
		throw new Error(
			`Evaluation did not cover every answer (missing ids: ${missing.join(", ") || "none"})`,
		);
	}

	return { evaluations, cost: data.cost };
};

export { postAnswers, postInterview };
