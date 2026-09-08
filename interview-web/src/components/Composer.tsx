import { useMutation } from "@tanstack/react-query";
import { ArrowUp } from "lucide-react";
import React from "react";
import {
	INTERVIEW_MUTATION_KEY,
	MAX_JOB_DESCRIPTION_LENGTH,
	postInterview,
} from "@/api/assistant";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQuestionsStore } from "@/store/store.ts";

const MAX_ROWS_HEIGHT = 200;

const newId = () =>
	typeof crypto.randomUUID === "function"
		? crypto.randomUUID()
		: String(Date.now() + Math.random());

/**
 * The message box. Owns the request, because the thing that sends should be the
 * thing that knows whether sending worked.
 *
 * The draft is local state on purpose: it changes on every keystroke, and
 * putting it in the store would re-render the whole transcript per character.
 */
const Composer = () => {
	const [draft, setDraft] = React.useState("");
	const textareaRef = React.useRef<HTMLTextAreaElement>(null);

	const settings = useQuestionsStore((state) => state.settings);
	const appendMessage = useQuestionsStore((state) => state.appendMessage);
	const setQuestions = useQuestionsStore((state) => state.setQuestions);
	const setCost = useQuestionsStore((state) => state.setCost);

	const mutation = useMutation({
		mutationKey: INTERVIEW_MUTATION_KEY,
		mutationFn: postInterview,
		onSuccess: (result) => {
			// The role comes back from the API rather than from what was sent:
			// the caller no longer supplies one.
			setQuestions(result.role, result.questions);
			setCost(result.cost);
			appendMessage(
				result.questions.length > 0
					? {
							id: newId(),
							role: "assistant",
							kind: "questions",
							jobRole: result.role,
							questions: result.questions,
						}
					: {
							id: newId(),
							role: "assistant",
							kind: "text",
							text: "That does not look like a job description. Paste the posting, or name the role you want to practise for.",
						},
			);
		},
		onError: () =>
			appendMessage({
				id: newId(),
				role: "assistant",
				kind: "text",
				text: "Could not generate questions. Please try again.",
			}),
	});

	// Grows with the content up to a cap, then scrolls inside itself.
	//
	// The overflow is toggled rather than left to CSS: setting the height from
	// scrollHeight lands a fraction of a pixel over, which is enough for the
	// browser to show a scrollbar on a box whose content already fits.
	const resize = (element: HTMLTextAreaElement) => {
		element.style.height = "auto";
		const wanted = element.scrollHeight;
		element.style.height = `${Math.min(wanted, MAX_ROWS_HEIGHT)}px`;
		element.style.overflowY = wanted > MAX_ROWS_HEIGHT ? "auto" : "hidden";
	};

	const tooLong = draft.length > MAX_JOB_DESCRIPTION_LENGTH;

	const send = () => {
		const text = draft.trim();
		if (!text || tooLong || mutation.isPending) {
			return;
		}

		appendMessage({ id: newId(), role: "user", kind: "text", text });
		mutation.mutate({ jobDescription: text, ...settings });

		setDraft("");
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			textareaRef.current.style.overflowY = "hidden";
		}
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		// Enter sends, Shift+Enter breaks the line. Checking isComposing keeps an
		// IME's confirmation Enter from submitting a half-typed word.
		if (
			event.key === "Enter" &&
			!event.shiftKey &&
			!event.nativeEvent.isComposing
		) {
			event.preventDefault();
			send();
		}
	};

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				send();
			}}
			className="border-t bg-background px-4 py-3 sm:px-6 lg:px-10"
		>
			<div className="mx-auto flex w-full max-w-3xl items-end gap-2">
				<label className="sr-only" htmlFor="composer">
					Your message
				</label>
				<Textarea
					id="composer"
					ref={textareaRef}
					value={draft}
					onChange={(event) => {
						setDraft(event.target.value);
						resize(event.target);
					}}
					onKeyDown={handleKeyDown}
					placeholder="Paste a job description, or name a role"
					rows={1}
					// Deliberately not disabled while pending: losing the field
					// mid-sentence is worse than allowing a queued draft.
					className="max-h-[200px] min-h-0 resize-none"
				/>
				<Button
					type="submit"
					size="icon"
					disabled={draft.trim() === "" || tooLong || mutation.isPending}
					aria-label="Send message"
				>
					<ArrowUp />
				</Button>
			</div>
			{/* Shown from 80% of the cap: a counter on a two-word role is noise,
			    and a silent 422 after pasting a long posting is worse. */}
			{draft.length > MAX_JOB_DESCRIPTION_LENGTH * 0.8 && (
				<p
					className={`mx-auto mt-1.5 w-full max-w-3xl text-right text-xs tabular-nums ${
						tooLong ? "text-destructive" : "text-muted-foreground"
					}`}
				>
					{draft.length.toLocaleString()} /{" "}
					{MAX_JOB_DESCRIPTION_LENGTH.toLocaleString()}
					{tooLong && " - too long to send"}
				</p>
			)}
		</form>
	);
};

export default Composer;
