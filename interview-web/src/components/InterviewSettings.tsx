import { useMutationState } from "@tanstack/react-query";
import { INTERVIEW_MUTATION_KEY } from "@/api/assistant";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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
import { Slider } from "./ui/slider";

// Mirrors InterviewModel in schema/schemas.py. See that file for the two checks
// a slug has to clear - supported parameters, and having a route that survives
// the account's OpenRouter data policy.
const MODELS = [{ label: "GPT-4o mini", value: "openai/gpt-4o-mini" }] as const;

const DIFFICULTY_LEVELS = [
	{ label: "Easy", value: "easy" },
	{ label: "Medium", value: "medium" },
	{ label: "Hard", value: "hard" },
] as const;

const SLIDERS = [
	{ key: "temperature", label: "Temperature", min: 0, max: 2 },
	{ key: "topP", label: "Top P", min: 0, max: 1 },
	{ key: "frequencyPenalty", label: "Frequency penalty", min: -2, max: 2 },
	{ key: "presencePenalty", label: "Presence penalty", min: -2, max: 2 },
] as const;

/**
 * The generation dials. No form and no submit: sending is the composer's job,
 * so this panel only reads and writes the store. That is also what lets it
 * unmount with the sidebar below 768px without losing the user's settings.
 */
const InterviewSettings = () => {
	const settings = useQuestionsStore((state) => state.settings);
	const setSetting = useQuestionsStore((state) => state.setSetting);

	// Locked while a request is in flight, so the values that produced the
	// pending answer cannot change underneath it.
	const statuses = useMutationState<string>({
		filters: { mutationKey: INTERVIEW_MUTATION_KEY },
		select: (mutation) => mutation.state.status,
	});
	const isPending = statuses.at(-1) === "pending";

	return (
		<FieldGroup>
			<Field>
				<FieldLabel>Model</FieldLabel>
				<Select
					items={MODELS}
					value={settings.model}
					onValueChange={(value) => setSetting("model", String(value))}
					disabled={isPending}
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
				<FieldLabel>Difficulty</FieldLabel>
				<Select
					items={DIFFICULTY_LEVELS}
					value={settings.difficulty}
					onValueChange={(value) => setSetting("difficulty", String(value))}
					disabled={isPending}
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
			{SLIDERS.map((dial) => (
				<Field key={dial.key}>
					<div className="flex items-center justify-between gap-2">
						<Label
							htmlFor={dial.key}
							className="font-medium text-muted-foreground text-xs tracking-wide"
						>
							{dial.label}
						</Label>
						<span className="text-muted-foreground text-xs tabular-nums">
							{settings[dial.key]}
						</span>
					</div>
					<Slider
						id={dial.key}
						// An array: the wrapper falls through to [min, max] and renders
						// two thumbs when handed a scalar.
						value={[settings[dial.key]]}
						onValueChange={(next) =>
							setSetting(dial.key, Array.isArray(next) ? next[0] : next)
						}
						min={dial.min}
						max={dial.max}
						step={0.1}
						disabled={isPending}
					/>
				</Field>
			))}
		</FieldGroup>
	);
};

export default InterviewSettings;
