import { useMutationState } from "@tanstack/react-query";
import { CircleAlert, ClipboardList, Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuestionsStore } from "@/store/store.ts";
import { INTERVIEW_MUTATION_KEY } from "./components/GenerateQuestionsForm.tsx";
import BaseLayout from "./pages/BaseLayout.tsx";

type RequestStatus = "idle" | "pending" | "success" | "error";

type Question = {
	id: string;
	question: string;
};

type QuestionListProps = {
	questions: Question[];
	role: string;
};

const EmptyState = () => (
	<div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
		<div className="flex size-12 items-center justify-center rounded-full bg-muted">
			<ClipboardList className="size-6 text-muted-foreground" />
		</div>
		<h2 className="font-semibold text-xl tracking-tight">No questions yet</h2>
		<p className="max-w-sm text-muted-foreground text-[0.9375rem] leading-relaxed">
			Enter a job title in the sidebar and choose{" "}
			<span className="font-medium text-foreground">Ask</span> to generate the
			questions you are most likely to be asked.
		</p>
	</div>
);

const LoadingState = () => (
	<>
		<div className="mb-6 space-y-2">
			<Skeleton className="h-4 w-40" />
			<Skeleton className="h-7 w-64" />
		</div>
		<Separator className="mb-6" />
		<ul className="space-y-3">
			{["a", "b", "c", "d", "e"].map((id, index) => (
				<li
					key={id}
					className="flex gap-4 rounded-lg border bg-card p-4"
					// Stagger the pulse so the group reads as loading, not frozen.
					style={{ animationDelay: `${index * 80}ms` }}
				>
					<Skeleton className="size-7 shrink-0 rounded-full" />
					<div className="flex-1 space-y-2 pt-1">
						<Skeleton className="h-3.5 w-full" />
						<Skeleton className="h-3.5 w-4/5" />
					</div>
				</li>
			))}
		</ul>
	</>
);

const ErrorState = () => (
	<output className="mt-8 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
		<CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
		<div className="space-y-1">
			<p className="font-medium text-[0.9375rem]">
				Could not generate questions
			</p>
			<p className="text-muted-foreground text-sm leading-relaxed">
				The response could not be read. This usually means the answer was cut
				short — try again from the sidebar.
			</p>
		</div>
	</output>
);

const QuestionList = ({ questions, role }: QuestionListProps) => (
	<>
		<header className="mb-6">
			<div className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
				<Sparkles className="size-4" />
				<span>Generated for</span>
				<span className="font-medium text-foreground">{role}</span>
			</div>
			<h2 className="mt-1.5 font-semibold text-2xl tracking-tight">
				Interview questions
			</h2>
			<p className="mt-1 text-muted-foreground text-sm">
				{questions.length} question{questions.length === 1 ? "" : "s"} you are
				most likely to be asked.
			</p>
		</header>
		<Separator className="mb-6" />
		<ol className="space-y-3">
			{questions.map((question, index) => (
				<li
					key={question.id}
					className="group flex gap-4 rounded-lg border bg-card p-4 text-card-foreground transition-colors hover:border-foreground/20 hover:bg-accent/40"
				>
					<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground text-xs tabular-nums transition-colors group-hover:bg-background">
						{index + 1}
					</span>
					<p className="pt-0.5 text-[0.9375rem] leading-relaxed">
						{question.question}
					</p>
				</li>
			))}
		</ol>
	</>
);

function App() {
	// Data comes from the store, which outlives both the mutation and the
	// sidebar. One selector per field: returning an object literal here would
	// create a new identity every render, which zustand v5 warns or loops on
	// unless wrapped in useShallow.
	const role = useQuestionsStore((state) => state.role);
	const questions = useQuestionsStore((state) => state.questions);

	console.log("App render", { role, questions });

	// Status stays with react-query, which owns the lifecycle of the request.
	const statuses = useMutationState<RequestStatus>({
		filters: { mutationKey: INTERVIEW_MUTATION_KEY },
		select: (mutation) => mutation.state.status,
	});
	const status = statuses.at(-1) ?? "idle";

	return (
		<BaseLayout>
			<div
				aria-busy={status === "pending"}
				aria-live="polite"
				className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-10"
			>
				{status === "pending" ? (
					<LoadingState />
				) : status === "error" ? (
					<ErrorState />
				) : questions.length > 0 ? (
					<QuestionList questions={questions} role={role} />
				) : (
					<EmptyState />
				)}
			</div>
		</BaseLayout>
	);
}

export default App;
