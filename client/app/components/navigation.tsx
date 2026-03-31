import { useAtom } from "jotai";
import { activePanelAtom, type NavPanel } from "~/lib/store";
import { cn } from "~/lib/utils";
import { NavQPanel as NavPanelShell } from "./nav-panel";

const items = [
	{
		id: "incidents",
		icon: "i-solar-danger-triangle-linear",
		label: "Incidents",
	},
	{
		id: "resources",
		icon: "i-solar-box-linear",
		label: "Resources",
	},
	{ id: "dashboard", icon: "i-solar-code-scan-bold", label: "Dashboard" },
	{ id: "analytics", icon: "i-solar-chart-2-bold-duotone", label: "Analytics" },
] as const;

export default function Navigation() {
	const [activePanel, setActivePanel] = useAtom(activePanelAtom);

	const isFullScreen = activePanel === "dashboard" || activePanel === "analytics";

	return (
		<aside className="flex h-full shrink-0 bg-stone-900 dark:bg-stone-950 border-r border-stone-700 dark:border-stone-800">
			{/* Icon rail */}
			<nav className="flex flex-col w-12 border-r border-stone-700 dark:border-stone-800 pt-1">
				{items.map(({ id, icon, label }) => {
					const active = activePanel === id;
					return (
						<button
							key={id}
							type="button"
							title={label}
							onClick={() => {
								setActivePanel(activePanel === id ? null : (id as NavPanel));
							}}
							className={cn(
								"relative flex items-center justify-center w-12 h-12 transition-colors group",
								active
									? "text-orange-400 bg-stone-800 border-r-2 border-r-orange-400"
									: "text-stone-400 dark:text-stone-300 hover:text-white hover:bg-stone-800",
							)}
						>
							<div className={cn(icon, "size-4")} />
							<span className="absolute left-full ml-2 px-2 py-1 rounded bg-stone-800 text-stone-200 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 font-mono">
								{label}
							</span>
						</button>
					);
				})}
			</nav>

			{/* Sidebar panels only — no full-screen panels here */}
			{activePanel && !isFullScreen && (
				<NavPanelShell panel={activePanel} />
			)}
		</aside>
	);
}
