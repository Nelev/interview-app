import { cn } from "@/lib/utils";

// Indexed by rating, so index 0 is a 1. Written out rather than built from a
// template string because Tailwind scans source statically - `bg-rating-${n}`
// generates no CSS at all.
const TONES = [
	"bg-rating-1",
	"bg-rating-2",
	"bg-rating-3",
	"bg-rating-4",
	"bg-rating-5",
];

const STEPS = [1, 2, 3, 4, 5];

type RatingProps = {
	rating: number;
	className?: string;
};

const Rating = ({ rating, className }: RatingProps) => {
	// The value is produced by the model, so a 0 or a 7 getting past the schema
	// would index off the end of TONES and render an invisible component.
	const value = Math.min(5, Math.max(1, Math.round(rating)));

	return (
		<span
			// One label for the group: five separate segments would otherwise be
			// announced as five anonymous elements, and the numeral again after.
			role="img"
			aria-label={`Rated ${value} out of 5`}
			className={cn("inline-flex items-center gap-1.5", className)}
		>
			<span className="flex gap-0.5">
				{STEPS.map((step) => (
					<span
						key={step}
						// Filled segments all take the tone of the value, so the colour
						// states the rating once rather than spelling out a gradient.
						// The count is what carries it for a red-green colour blind
						// reader, which is why the segments are not decorative.
						className={cn(
							"h-1.5 w-3 rounded-full",
							step <= value ? TONES[value - 1] : "bg-border",
						)}
					/>
				))}
			</span>
			<span className="font-medium text-muted-foreground text-xs tabular-nums">
				{value}/5
			</span>
		</span>
	);
};

export default Rating;
