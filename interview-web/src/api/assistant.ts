import type { Question } from "@/model/model";

const API_URL = "http://localhost:8000/interview";

type InterviewApiResponse = { response: { questions: Question[] } };

/** Mirrors InterviewRequest on the API: camelCase here, snake_case there, with
 *  the server's alias generator translating at the boundary. The numeric fields
 *  are numbers because the DTO declares them float - sending strings worked only
 *  because pydantic coerces them. */
export type InterviewParameters = {
	role: string;
	temperature: number;
	topP: number;
	frequencyPenalty: number;
	presencePenalty: number;
};

const postInterview = async (
	parameters: InterviewParameters,
): Promise<Question[]> => {
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
	return data.response.questions;
};

export { postInterview };
