import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useQuestionsStore } from "@/store/store.ts";
import { postInterview } from "../api/assistant.ts";
import { Slider } from "./ui/slider";
// Shared with App, which reads this mutation's result via useMutationState.
export const INTERVIEW_MUTATION_KEY = ["interview"] as const;

const GenerateQuestionsForm = () => {
	const setQuestions = useQuestionsStore((state) => state.setQuestions);

	const postInterviewMutation = useMutation({
		mutationKey: INTERVIEW_MUTATION_KEY,
		mutationFn: postInterview,
		onSuccess: (questions, parameters) =>
			setQuestions(parameters.role, questions),
	});

	const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const parameters = Object.fromEntries(formData.entries());
		const role = String(formData.get("role") ?? "").trim();
		if (!role) {
			return;
		}
		postInterviewMutation.mutate(
			parameters as {
				role: string;
				temperature: string;
				topP: string;
				frequencyPenalty: string;
				presencePenalty: string;
			},
		);
	};

	return (
		<form onSubmit={handleSubmit}>
			<FieldGroup>
				<Field>
					<FieldLabel>Job Title</FieldLabel>
					<Input
						name="role"
						required
						disabled={postInterviewMutation.isPending}
					/>
					<FieldDescription>
						Enter your job title to generate common interview questions.
					</FieldDescription>
				</Field>
				<Field>
					<FieldLabel>Temperature</FieldLabel>
					<Slider
						name="temperature"
						min={0}
						max={2}
						step={0.1}
						defaultValue={[0.7]}
					/>
				</Field>
				<Field>
					<FieldLabel>Top p</FieldLabel>
					<Slider name="topP" min={0} max={1} step={0.1} defaultValue={[1]} />
				</Field>
				<Field>
					<FieldLabel>Frequency Penalty</FieldLabel>
					<Slider
						name="frequencyPenalty"
						min={-2.0}
						max={2.0}
						step={0.1}
						defaultValue={[0.2]}
					/>
				</Field>
				<Field>
					<FieldLabel>Presence Penalty</FieldLabel>
					<Slider
						name="presencePenalty"
						min={-2.0}
						max={2.0}
						step={0.1}
						defaultValue={[0.2]}
					/>
				</Field>
				<Field>
					<Button type="submit" disabled={postInterviewMutation.isPending}>
						{postInterviewMutation.isPending ? "Generating…" : "Ask"}
					</Button>
					{postInterviewMutation.isError && (
						<FieldDescription>
							Could not generate questions. Please try again.
						</FieldDescription>
					)}
				</Field>
			</FieldGroup>
		</form>
	);
};

export default GenerateQuestionsForm;
