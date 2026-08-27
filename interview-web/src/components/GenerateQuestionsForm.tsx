import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { postInterview } from "../api/assistant.ts";
import { Slider } from "./ui/slider";

// Shared with App, which reads this mutation's result via useMutationState.
export const INTERVIEW_MUTATION_KEY = ["interview"] as const;

const GenerateQuestionsForm = () => {
	const mutation = useMutation({
		mutationKey: INTERVIEW_MUTATION_KEY,
		mutationFn: postInterview,
	});

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const jobTitle = String(formData.get("jobTitle") ?? "").trim();
		if (!jobTitle) {
			return;
		}
		mutation.mutate(jobTitle);
	};

	return (
		<form onSubmit={handleSubmit}>
			<FieldGroup>
				<Field>
					<FieldLabel>Job Title</FieldLabel>
					<Input name="jobTitle" required disabled={mutation.isPending} />
					<FieldDescription>
						Enter your job title to generate common interview questions.
					</FieldDescription>
				</Field>
				<Field>
					<FieldLabel>Temperature</FieldLabel>
					<Slider
						name="temperature"
						min={0}
						max={1}
						step={0.1}
						defaultValue={[0.5]}
					/>
				</Field>
				<Field>
					<FieldLabel>Top p</FieldLabel>
					<Slider name="topP" min={0} max={1} step={0.1} defaultValue={[0.9]} />
				</Field>
				<Field>
					<FieldLabel>Frequency Penalty</FieldLabel>
					<Slider
						name="frequencyPenalty"
						min={0}
						max={1}
						step={0.1}
						defaultValue={[0.5]}
					/>
				</Field>
				<Field>
					<FieldLabel>Presence Penalty</FieldLabel>
					<Slider
						name="presencePenalty"
						min={0}
						max={1}
						step={0.1}
						defaultValue={[0.5]}
					/>
				</Field>
				<Field>
					<Button type="submit" disabled={mutation.isPending}>
						{mutation.isPending ? "Generating…" : "Ask"}
					</Button>
					{mutation.isError && (
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
