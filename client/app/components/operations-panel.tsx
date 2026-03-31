import React from "react";
import { AnalyticsPanel } from "./analytics-panel";
import { DashboardPanel } from "./dashboard.panel";

type OperationsPanelProps = {
	initialTab: "dashboard" | "analytics";
	onClose: () => void;
};

export function OperationsPanel({ initialTab, onClose }: OperationsPanelProps) {
	const [activeTab, setActiveTab] = React.useState<"dashboard" | "analytics">(
		initialTab,
	);

	React.useEffect(() => {
		setActiveTab(initialTab);
	}, [initialTab]);

	return (
		<div className="fixed inset-0 z-300 flex flex-col bg-stone-50 dark:bg-stone-950">
			{/* Top bar */}
			<header className="h-11 shrink-0 flex items-center justify-between bg-stone-900 border-b border-stone-700 px-4">
				<div className="flex items-center gap-3">
					{/* Back arrow — always visible */}
					<button
						type="button"
						onClick={onClose}
						className="flex items-center gap-1.5 text-stone-200 hover:text-white transition-colors mr-1"
						title="Back to map"
					>
						<div className="i-lucide-arrow-left size-4" />
					</button>
					<div className="w-px h-5 bg-stone-700" />
					<span className="text-xs font-mono font-semibold uppercase tracking-widest text-stone-400">
						Operations
					</span>
					{/* Tab switcher */}
					<div className="flex items-center border-l border-stone-700 pl-3 gap-1">
						<button
							type="button"
							onClick={() => setActiveTab("dashboard")}
							className={
								activeTab === "dashboard"
									? "px-3 py-1 rounded text-xs font-mono font-semibold uppercase tracking-wider bg-stone-700 text-stone-100"
									: "px-3 py-1 rounded text-xs font-mono uppercase tracking-wider text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
							}
						>
							Dashboard
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("analytics")}
							className={
								activeTab === "analytics"
									? "px-3 py-1 rounded text-xs font-mono font-semibold uppercase tracking-wider bg-stone-700 text-stone-100"
									: "px-3 py-1 rounded text-xs font-mono uppercase tracking-wider text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
							}
						>
							Analytics
						</button>
					</div>
				</div>

				<button
					type="button"
					onClick={onClose}
					className="flex items-center gap-2 px-4 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider text-white bg-orange-600 hover:bg-orange-500 transition-colors"
				>
					<div className="i-lucide-x size-3.5" />
					Close
				</button>
			</header>

			{/* Content */}
			<div className="flex-1 overflow-y-auto">
				{activeTab === "dashboard" && <DashboardPanel />}
				{activeTab === "analytics" && <AnalyticsPanel />}
			</div>
		</div>
	);
}
