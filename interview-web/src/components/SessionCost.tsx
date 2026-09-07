import { useQuestionsStore } from "@/store/store";

// Built once at module scope: constructing an Intl formatter is expensive
// enough that doing it per render is wasteful.
//
// Four decimals is chosen for the range this actually covers - a single call is
// around $0.0003, and the 200/day rate limit caps a session near $0.30. Two
// decimals would render every realistic session as "$0.00".
const COST_FORMAT = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	minimumFractionDigits: 2,
	maximumFractionDigits: 4,
});

const SessionCost = () => {
	const cost = useQuestionsStore((state) => state.cost);

	return (
		<div className="flex items-baseline justify-between gap-2 border-t px-2 pt-3 text-xs">
			<span className="text-muted-foreground">Session cost</span>
			{/* tabular-nums keeps the figure from shifting width as digits change. */}
			<span className="font-medium tabular-nums">
				{COST_FORMAT.format(cost)}
			</span>
		</div>
	);
};

export default SessionCost;
