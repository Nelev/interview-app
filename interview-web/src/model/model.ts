export type Question = {
	id: number;
	question: string;
};

export type InterviewApiResponse = { response: { questions: Question[] } };

export type InterviewParameters = {
	role: string;
	temperature: number;
	topP: number;
	frequencyPenalty: number;
	presencePenalty: number;
};

/** One evaluation returned by /answers. The answer text is not echoed back:
 *  the client already holds it keyed by id, so returning it would spend
 *  output tokens on data the caller sent. */
export type AnswerResponse = {
	id: number;
	rating: number;
	suggestedImprovements: string;
};
export type AnswersApiResponse = { response: { answers: AnswerResponse[] } };

/** One answered question sent to /answers for evaluation. */
export type SubmittedAnswer = {
	id: number;
	question: string;
	answer: string;
};
