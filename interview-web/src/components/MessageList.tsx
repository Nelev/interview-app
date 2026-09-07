import { useMutationState } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import React from "react";
import { INTERVIEW_MUTATION_KEY } from "@/api/assistant";
import { Skeleton } from "@/components/ui/skeleton";
import type { Question } from "@/model/model";
import { useQuestionsStore } from "@/store/store.ts";
import EvaluateAnswersButton from "./EvaluateAnswersButton.tsx";
import QuestionCard from "./QuestionCard.tsx";

const EmptyState = () => (
	<div className="flex flex-col items-center justify-center gap-3 text-center">
		<div className="flex size-12 items-center justify-center rounded-full bg-muted">
			<ClipboardList className="size-6 text-muted-foreground" />
		</div>
		<h2 className="font-semibold text-xl tracking-tight">
			Practise an interview
		</h2>
		<p className="max-w-sm text-muted-foreground text-[0.9375rem] leading-relaxed">
			Send a job title to get the ten questions you are most likely to be asked,
			then answer them to have each one rated.
		</p>
	</div>
);

const Pending = () => (
	<div className="flex gap-3">
		<Skeleton className="size-7 shrink-0 rounded-full" />
		<div className="flex-1 space-y-2 pt-1">
			<Skeleton className="h-3.5 w-4/5" />
			<Skeleton className="h-3.5 w-2/3" />
		</div>
	</div>
);

const UserBubble = ({ text }: { text: string }) => (
	<div className="flex justify-end">
		{/* whitespace-pre-wrap so Shift+Enter line breaks survive. */}
		<p className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-[0.9375rem] text-primary-foreground leading-relaxed">
			{text}
		</p>
	</div>
);

const AssistantText = ({ text }: { text: string }) => (
	<p className="max-w-[80%] whitespace-pre-wrap text-[0.9375rem] leading-relaxed">
		{text}
	</p>
);

/**
 * The questions of the current interview, as answerable cards.
 *
 * Only the newest question set is interactive. QuestionCard reads answers and
 * evaluations from the store by question id, and the store holds one interview
 * at a time - so an older set would show the current interview's answers
 * against its own ids. Earlier sets stay in the transcript as plain text.
 */
const QuestionsMessage = ({
	questions,
	interactive,
}: {
	questions: Question[];
	interactive: boolean;
}) => {
	if (!interactive) {
		return (
			<ol className="max-w-[90%] list-decimal space-y-1.5 pl-5 text-muted-foreground text-sm leading-relaxed">
				{questions.map((question) => (
					<li key={question.id}>{question.question}</li>
				))}
			</ol>
		);
	}

	return (
		<div>
			<ol className="space-y-3">
				{questions.map((question, index) => (
					<QuestionCard key={question.id} question={question} index={index} />
				))}
			</ol>
			<EvaluateAnswersButton />
		</div>
	);
};

const MessageList = () => {
	const messages = useQuestionsStore((state) => state.messages);
	const bottomRef = React.useRef<HTMLDivElement>(null);

	const statuses = useMutationState<string>({
		filters: { mutationKey: INTERVIEW_MUTATION_KEY },
		select: (mutation) => mutation.state.status,
	});
	const isPending = statuses.at(-1) === "pending";

	// Only the last question set stays interactive - see QuestionsMessage.
	const lastQuestionsId = React.useMemo(
		() => messages.filter((message) => message.kind === "questions").at(-1)?.id,
		[messages],
	);

	// Both values are read in the body, not just listed: an effect whose
	// dependencies only act as triggers is flagged, and dropping them would
	// leave this running once on mount and never scrolling again.
	const messageCount = messages.length;
	React.useEffect(() => {
		if (messageCount === 0 && !isPending) {
			return;
		}
		bottomRef.current?.scrollIntoView({ block: "end" });
	}, [messageCount, isPending]);

	if (messages.length === 0 && !isPending) {
		return (
			<div className="mx-auto flex min-h-full w-full max-w-3xl items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
				<EmptyState />
			</div>
		);
	}

	return (
		<div
			aria-busy={isPending}
			aria-live="polite"
			className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-10"
		>
			{messages.map((message) =>
				message.role === "user" ? (
					<UserBubble key={message.id} text={message.text} />
				) : message.kind === "questions" ? (
					<QuestionsMessage
						key={message.id}
						questions={message.questions}
						interactive={message.id === lastQuestionsId}
					/>
				) : (
					<AssistantText key={message.id} text={message.text} />
				),
			)}
			{isPending && <Pending />}
			<div ref={bottomRef} />
		</div>
	);
};

export default MessageList;
