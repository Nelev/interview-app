import { Check, PenLine } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import type { Question } from "@/model/model";
import { useQuestionsStore } from "@/store/store.ts";

type QuestionCardProps = {
	question: Question;
	index: number;
};

const QuestionCard = ({ question, index }: QuestionCardProps) => {
	// The draft stays local: typing never writes to the store, so keystrokes in
	// one card cannot re-render the other nine.
	const [draft, setDraft] = useState("");
	const textareaId = useId();

	// Selecting the action gives a stable reference, so saving in another card
	// does not re-render this one.
	const setAnswer = useQuestionsStore((state) => state.setAnswer);
	const savedAnswer = useQuestionsStore((state) => state.answers[question.id]);
	// Selected per id, so a card only re-renders when its own evaluation lands.
	const evaluation = useQuestionsStore(
		(state) => state.evaluations[question.id],
	);

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const answer = draft.trim();
		if (!answer) {
			return;
		}
		setAnswer(question.id, answer);
	};

	const isSaved = savedAnswer !== undefined && savedAnswer === draft.trim();

	return (
		<li className="group rounded-lg border bg-card text-card-foreground transition-colors hover:border-foreground/20">
			<Collapsible defaultOpen={false}>
				<div className="flex gap-4 p-4">
					<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground text-xs tabular-nums transition-colors group-hover:bg-background">
						{index + 1}
					</span>
					<div className="flex-1 space-y-3">
						<p className="pt-0.5 text-[0.9375rem] leading-relaxed">
							{question.question}
						</p>
						<CollapsibleTrigger
							render={
								<Button
									variant="ghost"
									size="xs"
									className="-ml-2 text-muted-foreground"
								/>
							}
						>
							{savedAnswer === undefined ? (
								<>
									<PenLine />
									Answer
								</>
							) : (
								<>
									<Check className="text-primary" />
									Answered
								</>
							)}
						</CollapsibleTrigger>
						{evaluation !== undefined && (
							<span className="ml-2 rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs tabular-nums">
								{evaluation.rating}/5
								<span className="sr-only"> rating</span>
							</span>
						)}
						<CollapsibleContent>
							<form onSubmit={handleSubmit} className="space-y-2 pb-1">
								<label className="sr-only" htmlFor={textareaId}>
									Your answer to question {index + 1}
								</label>
								<Textarea
									id={textareaId}
									value={draft}
									onChange={(event) => setDraft(event.target.value)}
									placeholder="Type your answer…"
									rows={4}
								/>
								<div className="flex items-center gap-3">
									<Button type="submit" size="sm" disabled={!draft.trim()}>
										Send answer
									</Button>
									{isSaved && (
										<output className="text-muted-foreground text-xs">
											Answer saved
										</output>
									)}
								</div>
							</form>
							{evaluation !== undefined &&
								evaluation.suggestedImprovements !== "" && (
									<div className="mt-3 rounded-md border bg-muted/40 p-3">
										<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
											Suggested improvements
										</p>
										<p className="mt-1.5 text-sm leading-relaxed">
											{evaluation.suggestedImprovements}
										</p>
									</div>
								)}
						</CollapsibleContent>
					</div>
				</div>
			</Collapsible>
		</li>
	);
};

export default QuestionCard;
