import { useAtom } from "jotai";
import { activePanelAtom, type NavPanel } from "~/lib/store";
import { IncidentsPanel } from "./incidents-panel";
import { ResourcesPanel } from "./resources-panel";

export function NavQPanel({ panel }: { panel: NavPanel }) {
	const [, setActivePanel] = useAtom(activePanelAtom);

	return (
		<div className="h-full w-80 bg-stone-50 dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden">
			<header className="px-4 py-3 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0 bg-stone-100 dark:bg-stone-950">
				<span className="text-xs font-mono font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
					{panel}
				</span>
				<button
					type="button"
					onClick={() => setActivePanel(null)}
					className="flex items-center justify-center size-6 rounded bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400 transition-colors"
				>
					<div className="i-lucide-x size-3" />
				</button>
			</header>

			<div className="flex-1 overflow-y-auto p-3">
				{panel === "incidents" && <IncidentsPanel />}
				{panel === "resources" && <ResourcesPanel />}
			</div>
		</div>
	);
}
