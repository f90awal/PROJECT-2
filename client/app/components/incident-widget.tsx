import { useAtom } from "jotai";
import { activePanelAtom } from "~/lib/store";
import { useIncidents } from "~/lib/use-incidents";

export const IncidentWidget = () => {
	const [, setActivePanel] = useAtom(activePanelAtom);
	const { items: incidents } = useIncidents({ limit: 100 });

	const active = incidents.filter(
		(incident) => !["resolved", "cancelled"].includes(incident.status),
	).length;
	const total = incidents.length;

	return (
		<button
			onClick={() => setActivePanel("incidents")}
			type="button"
			title={`${active} of ${total} incidents active`}
			className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-stone-800 dark:bg-stone-900 border border-stone-700 dark:border-stone-800 hover:border-stone-500 transition-colors"
		>
			<div className="i-solar-danger-triangle-linear size-3.5 text-orange-400" />
			<span className="text-xs font-mono font-semibold text-stone-300">
				{active}
				<span className="text-stone-600 font-normal"> / {total}</span>
			</span>
		</button>
	);
};
