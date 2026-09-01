import { useMutation } from "@tanstack/react-query";
import { CircleAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuestionsStore } from "@/store/store.ts";
import { postAnswers } from "../api/assistant.ts";

export const EVALUATE_MUTATION_KEY = ["evaluate"] as const;

const EvaluateAnswersButton = () => {
	// Individual selectors: this component re-renders when the answer set
	// changes, but not when an unrelated slice of the store does.
	const role = useQuestionsStore((state) => state.role);
	const questions = useQuestionsStore((state) => state.questions);
	const answers = useQuestionsStore((state) => state.answers);
	const setEvaluations = useQuestionsStore((state) => state.setEvaluations);

	const mutation = useMutation({
		mutationKey: EVALUATE_MUTATION_KEY,
		mutationFn: postAnswers,
		// Declared here rather than passed to mutate(): per-call callbacks are
		// skipped when the component unmounts before the mutation settles, and
		// this call is slow enough for that to happen.
		onSuccess: (evaluations) => setEvaluations(evaluations),
	});

	// Only answered questions are sent. Unanswered ones would spend output
	// tokens to be rated 1, which is noise.
	const submitted = questions
		.filter((question) => answers[question.id] !== undefined)
		.map((question) => ({
			id: question.id,
			question: question.question,
			answer: answers[question.id],
		}));

	const canSubmit = submitted.length > 0 && !mutation.isPending;

	return (
		<div className="mt-6 space-y-3 border-t pt-6">
			<div className="flex flex-wrap items-center gap-3">
				<Button
					type="button"
					disabled={!canSubmit}
					onClick={() => mutation.mutate({ role, answers: submitted })}
				>
					<Sparkles />
					{mutation.isPending
						? "Evaluating…"
						: `Evaluate ${submitted.length} answer${
								submitted.length === 1 ? "" : "s"
							}`}
				</Button>
				<p className="text-muted-foreground text-xs">
					{submitted.length === 0
						? "Answer at least one question to get feedback."
						: "Sends your answers for a rating and suggested improvements."}
				</p>
			</div>
			{mutation.isError && (
				<output
					aria-live="polite"
					className="flex items-start gap-2 text-destructive text-xs"
				>
					<CircleAlert className="mt-px size-3.5 shrink-0" />
					<span>
						{mutation.error instanceof Error
							? mutation.error.message
							: "Could not evaluate the answers."}
					</span>
				</output>
			)}
		</div>
	);
};

export default EvaluateAnswersButton;
