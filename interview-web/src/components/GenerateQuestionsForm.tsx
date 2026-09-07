import { useMutation } from "@tanstack/react-query";
import React from "react";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useQuestionsStore } from "@/store/store.ts";
import { postInterview } from "../api/assistant.ts";
import { Slider } from "./ui/slider";

// Shared with App, which reads this mutation's result via useMutationState.
export const INTERVIEW_MUTATION_KEY = ["interview"] as const;

const MODELS = [{ label: "GPT-4o mini", value: "openai/gpt-4o-mini" }] as const;

const DIFFICULTY_LEVELS = [
	{ label: "Easy", value: "easy" },
	{ label: "Medium", value: "medium" },
	{ label: "Hard", value: "hard" },
] as const;

const GenerateQuestionsForm = () => {
	const [temperature, setTemperature] = React.useState<number>(0.7);
	const [topP, setTopP] = React.useState<number>(1);
	const [frequencyPenalty, setFrequencyPenalty] = React.useState<number>(0.2);
	const [presencePenalty, setPresencePenalty] = React.useState<number>(0.2);
	const [difficulty, setDifficulty] = React.useState<string | null>(
		DIFFICULTY_LEVELS[0].value,
	);
	const [model, setModel] = React.useState<string | null>(MODELS[0].value);

	const setQuestions = useQuestionsStore((state) => state.setQuestions);
	const setCost = useQuestionsStore((state) => state.setCost);

	const mutation = useMutation({
		mutationKey: INTERVIEW_MUTATION_KEY,
		mutationFn: postInterview,
		onSuccess: (questions, parameters) => {
			setQuestions(parameters.role, questions.questions);
			setCost(questions.cost);
		},
	});

	const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		const role = String(
			new FormData(event.currentTarget).get("role") ?? "",
		).trim();
		if (!role) {
			return;
		}
		mutation.mutate({
			role,
			temperature,
			topP,
			frequencyPenalty,
			presencePenalty,
			difficulty: difficulty ?? DIFFICULTY_LEVELS[0].value,
			model: model ?? MODELS[0].value,
		});
	};

	return (
		<form onSubmit={handleSubmit}>
			<FieldGroup>
				<Field>
					<FieldLabel>Job Title</FieldLabel>
					<Input name="role" required disabled={mutation.isPending} />
					<FieldDescription className="text-xs">
						Enter your job title to generate common interview questions.
					</FieldDescription>
				</Field>
				<Field>
					<FieldLabel>Select a model</FieldLabel>
					<Select
						items={MODELS}
						name="model"
						value={model}
						onValueChange={(value) => setModel(value)}
						disabled={mutation.isPending}
					>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="Select a model" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								{MODELS.map((model) => (
									<SelectItem key={model.value} value={model.value}>
										{model.label}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</Field>
				<Field>
					<FieldLabel>Select a difficulty level</FieldLabel>
					<Select
						items={DIFFICULTY_LEVELS}
						name="difficulty"
						defaultValue={DIFFICULTY_LEVELS[0].value}
						disabled={mutation.isPending}
						onValueChange={(value) => setDifficulty(value)}
					>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="Select a difficulty level" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								{DIFFICULTY_LEVELS.map((level) => (
									<SelectItem key={level.value} value={level.value}>
										{level.label}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</Field>
				<Field>
					<div className="flex items-center justify-between gap-2">
						<Label
							htmlFor="temperature"
							className="font-medium text-muted-foreground text-xs tracking-wide"
						>
							Temperature
						</Label>
						<span className="text-muted-foreground text-xs tabular-nums">
							{temperature}
						</span>
					</div>
					<Slider
						id="temperature"
						name="temperature"
						value={[temperature]}
						onValueChange={(next) =>
							setTemperature(Array.isArray(next) ? next[0] : next)
						}
						min={0}
						max={2}
						step={0.1}
					/>
				</Field>

				<Field>
					<div className="flex items-center justify-between gap-2">
						<Label
							htmlFor="topP"
							className="font-medium text-muted-foreground text-xs tracking-wide"
						>
							Top P
						</Label>
						<span className="text-muted-foreground text-xs tabular-nums">
							{topP}
						</span>
					</div>
					<Slider
						id="topP"
						name="topP"
						value={[topP]}
						onValueChange={(next) =>
							setTopP(Array.isArray(next) ? next[0] : next)
						}
						min={0}
						max={1}
						step={0.1}
					/>
				</Field>

				<Field>
					<div className="flex items-center justify-between gap-2">
						<Label
							htmlFor="frequencyPenalty"
							className="font-medium text-muted-foreground text-xs tracking-wide"
						>
							Frequency Penalty
						</Label>
						<span className="text-muted-foreground text-xs tabular-nums">
							{frequencyPenalty}
						</span>
					</div>
					<Slider
						id="frequencyPenalty"
						name="frequencyPenalty"
						value={[frequencyPenalty]}
						onValueChange={(next) =>
							setFrequencyPenalty(Array.isArray(next) ? next[0] : next)
						}
						min={-2}
						max={2}
						step={0.1}
					/>
				</Field>

				<Field>
					<div className="flex items-center justify-between gap-2">
						<Label
							htmlFor="presencePenalty"
							className="font-medium text-muted-foreground text-xs tracking-wide"
						>
							Presence penalty
						</Label>
						<span className="text-muted-foreground text-xs tabular-nums">
							{presencePenalty}
						</span>
					</div>
					<Slider
						id="presencePenalty"
						name="presencePenalty"
						value={[presencePenalty]}
						onValueChange={(next) =>
							setPresencePenalty(Array.isArray(next) ? next[0] : next)
						}
						min={-2}
						max={2}
						step={0.1}
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
