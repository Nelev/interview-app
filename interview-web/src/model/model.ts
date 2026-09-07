export type Question = {
	id: number;
	question: string;
};

export type InterviewApiResponse = {
	response: { questions: Question[] };
	/** null when the provider did not report a cost. Not the same as zero. */
	cost: number | null;
};

export type InterviewParameters = {
	role: string;
	temperature: number;
	topP: number;
	frequencyPenalty: number;
	presencePenalty: number;
	difficulty: string;
	model: string;
};

/** One evaluation returned by /answers. The answer text is not echoed back:
 *  the client already holds it keyed by id, so returning it would spend
 *  output tokens on data the caller sent. */
export type AnswerResponse = {
	id: number;
	rating: number;
	suggestedImprovements: string;
};
export type AnswersApiResponse = {
	response: { answers: AnswerResponse[] };
	/** null when the provider did not report a cost. Not the same as zero. */
	cost: number | null;
};

/** One answered question sent to /answers for evaluation. */
export type SubmittedAnswer = {
	id: number;
	question: string;
	answer: string;
};
