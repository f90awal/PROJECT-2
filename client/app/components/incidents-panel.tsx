import { useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import React from "react";
import { resolveIncidentTypeIcon, statusClass } from "~/lib/config";
import { incidentFocusRequestAtom } from "~/lib/store";
import { useIncidents } from "~/lib/use-incidents";

const statusBadgeFallbackClass =
	"bg-stone-100 text-stone-600 border border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700";

export function IncidentsPanel() {
	const { items: incidents, isLoading, resolve } = useIncidents({ limit: 100 });
	const queryClient = useQueryClient();
	const requestIncidentFocus = useSetAtom(incidentFocusRequestAtom);
	const [openOnly, setOpenOnly] = React.useState(false);

	React.useEffect(() => {
		const timer = setInterval(() => {
			queryClient.invalidateQueries({ queryKey: ["incidents"] });
		}, 3000);

		return () => clearInterval(timer);
	}, [queryClient]);

	const openIncidents = React.useMemo(
		() =>
			incidents.filter(
				(incident) => !["resolved", "cancelled"].includes(incident.status),
			),
		[incidents],
	);

	const scopedIncidents = openOnly ? openIncidents : incidents;

	if (isLoading) {
		return (
			<div className="h-full flex flex-col items-center justify-center gap-2 py-8">
				<div className="i-solar-refresh-bold-duotone size-8 text-stone-300 dark:text-stone-700 animate-spin" />
				<p className="text-xs font-mono text-stone-400">loading...</p>
			</div>
		);
	}

	if (incidents.length === 0) {
		return (
			<div className="h-full flex flex-col items-center justify-center gap-2 py-8 text-center">
				<div className="i-solar-danger-triangle-linear size-8 text-stone-300 dark:text-stone-700" />
				<p className="text-xs font-mono font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-600">
					No incidents
				</p>
				<p className="text-xs font-mono text-stone-400 dark:text-stone-700">
					click map to report
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<p className="text-xs font-mono text-stone-400 dark:text-stone-500">
					{openIncidents.length} / {incidents.length} active
				</p>
				<label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
					<span className="text-xs font-mono text-stone-400 dark:text-stone-500">Open only</span>
					<input
						type="checkbox"
						checked={openOnly}
						onChange={(e) => setOpenOnly(e.target.checked)}
						className="sr-only"
					/>
					<span
						className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
							openOnly ? "bg-orange-500" : "bg-stone-300 dark:bg-stone-700"
						}`}
					>
						<span
							className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
								openOnly ? "translate-x-4.5" : "translate-x-0.5"
							}`}
						/>
					</span>
				</label>
			</div>

			{scopedIncidents.length === 0 ? (
				<p className="py-6 text-center text-xs font-mono text-stone-400 dark:text-stone-600">
					no open incidents
				</p>
			) : (
				<ul className="rounded border border-stone-200 dark:border-stone-800 overflow-hidden divide-y divide-stone-100 dark:divide-stone-800">
					{scopedIncidents.map((incident) => {
						const config = resolveIncidentTypeIcon(incident.type.code);
						const badgeClass =
							statusClass[incident.status] ?? statusBadgeFallbackClass;
						const isResolvable = !["resolved", "cancelled"].includes(
							incident.status,
						);

						return (
							// biome-ignore lint/a11y/useKeyWithClickEvents: list item acts as a map focus trigger
							<li
								key={incident.id}
								className="group flex items-center gap-2 px-3 py-2 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
								onClick={() =>
									requestIncidentFocus({
										incidentId: incident.id,
										requestId: Date.now(),
									})
								}
							>
								<span
									className={`shrink-0 inline-flex size-5 items-center justify-center rounded ${config.color}`}
								>
									<span className={`${config.icon} size-3`} />
								</span>

								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-1.5">
										<span
											className={`inline-flex rounded px-1.5 py-px text-[9px] font-mono font-semibold uppercase tracking-wide ${badgeClass}`}
										>
											{incident.status.replace("_", " ")}
										</span>
										<span className="text-[10px] font-mono text-stone-400 dark:text-stone-600">
											#{incident.id}
										</span>
									</div>
									{incident.description && (
										<p className="mt-0.5 text-[11px] font-mono text-stone-500 dark:text-stone-400 truncate">
											{incident.description}
										</p>
									)}
								</div>

								{isResolvable && (
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											resolve.mutate({ id: incident.id, status: "resolved" });
										}}
										disabled={resolve.isPending}
										className="shrink-0 rounded px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60 transition-colors"
									>
										Resolve
									</button>
								)}
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
