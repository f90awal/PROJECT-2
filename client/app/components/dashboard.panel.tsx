import React from "react";
import { type TimeWindow, useAnalytics } from "~/lib/use-analytics";
import { useDispatchResources } from "~/lib/use-dispatch";
import { useIncidents } from "~/lib/use-incidents";

function serviceTone(service: string) {
	if (service === "ambulance") return "bg-blue-500";
	if (service === "fire") return "bg-orange-500";
	if (service === "police") return "bg-indigo-500";
	return "bg-stone-500";
}

function serviceBorder(service: string) {
	if (service === "ambulance") return "border-l-blue-500";
	if (service === "fire") return "border-l-orange-500";
	if (service === "police") return "border-l-indigo-500";
	return "border-l-stone-500";
}

function statusBucket(status: string) {
	if (status === "created") return "Created";
	if (status === "dispatched") return "Dispatched";
	if (status === "in_progress") return "In Progress";
	if (status === "resolved") return "Resolved";
	if (status === "cancelled") return "Cancelled";
	return "Other";
}

function statusColor(label: string) {
	if (label === "Resolved") return "text-emerald-500";
	if (label === "Cancelled") return "text-stone-400 dark:text-stone-600";
	if (label === "Dispatched") return "text-blue-500";
	if (label === "In Progress") return "text-amber-500";
	return "text-stone-500 dark:text-stone-400";
}

function fmtMinutes(value: number | null | undefined) {
	if (typeof value !== "number" || !Number.isFinite(value)) return "—";
	return `${value.toFixed(1)}m`;
}

function windowLabel(value: TimeWindow) {
	if (value === "7d") return "7d";
	if (value === "30d") return "30d";
	return "90d";
}

export function DashboardPanel() {
	const [window, setWindow] = React.useState<TimeWindow>("30d");
	const { items: incidents, isLoading: incidentsLoading } = useIncidents({
		limit: 300,
	});
	const {
		vehicles,
		activeDispatches,
		isLoading: resourcesLoading,
	} = useDispatchResources();
	const {
		responseTimesQuery,
		incidentsByRegionQuery,
		isLoading,
		isError,
		error,
	} = useAnalytics(window);

	const statusCounts = React.useMemo(() => {
		const map = new Map<string, number>();
		for (const incident of incidents) {
			const key = statusBucket(incident.status);
			map.set(key, (map.get(key) ?? 0) + 1);
		}
		return map;
	}, [incidents]);

	const respondersAvailable = vehicles.filter(
		(vehicle) => vehicle.status === "available",
	).length;

	const openIncidents = incidents.filter(
		(incident) => !["resolved", "cancelled"].includes(incident.status),
	).length;

	const topRegions = React.useMemo(() => {
		const rows = incidentsByRegionQuery.data?.breakdown ?? [];
		const grouped = new Map<string, number>();
		for (const item of rows) {
			grouped.set(item.region, (grouped.get(item.region) ?? 0) + item.count);
		}
		return Array.from(grouped.entries())
			.map(([region, count]) => ({ region, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 5);
	}, [incidentsByRegionQuery.data]);

	if (isLoading || incidentsLoading || resourcesLoading) {
		return (
			<div className="min-h-[60vh] flex flex-col items-center justify-center gap-2">
				<div className="i-solar-refresh-bold-duotone size-8 text-stone-300 dark:text-stone-700 animate-spin" />
				<p className="text-xs font-mono text-stone-400">loading dashboard...</p>
			</div>
		);
	}

	if (isError) {
		return (
			<div className="min-h-[60vh] flex flex-col items-center justify-center gap-2 text-center">
				<div className="i-solar-danger-bold-duotone size-8 text-red-400" />
				<p className="text-xs font-mono font-semibold uppercase tracking-wider text-stone-500">
					Dashboard unavailable
				</p>
				<p className="text-xs font-mono text-stone-400 max-w-xs">
					{error instanceof Error ? error.message : "Check analytics service connectivity."}
				</p>
			</div>
		);
	}

	const overallAvg = responseTimesQuery.data?.overall.avgMinutes;
	const totalDispatches = responseTimesQuery.data?.overall.totalDispatches ?? 0;
	const totalArrived = responseTimesQuery.data?.overall.totalArrived ?? 0;
	const arrivalRate = totalDispatches > 0 ? ((totalArrived / totalDispatches) * 100).toFixed(0) : "—";

	return (
		<div className="p-0">
			{/* Command strip — stat row across full width */}
			<div className="border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
				<div className="flex items-center">
					{[
						{ label: "Open Incidents", value: openIncidents, hi: openIncidents > 5 },
						{ label: "Active Dispatches", value: activeDispatches.length, hi: false },
						{ label: "Available", value: respondersAvailable, hi: false },
						{ label: `Avg Response (${windowLabel(window)})`, value: fmtMinutes(overallAvg), hi: false },
						{ label: "Total Dispatches", value: totalDispatches, hi: false },
						{ label: "Arrival Rate", value: `${arrivalRate}%`, hi: false },
					].map((stat) => (
						<div
							key={stat.label}
							className="flex-1 border-r border-stone-200 dark:border-stone-800 last:border-r-0 px-5 py-4"
						>
							<p className="text-[9px] font-mono uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1">
								{stat.label}
							</p>
							<p className={`text-2xl font-mono font-bold ${stat.hi ? "text-red-500" : "text-stone-900 dark:text-stone-100"}`}>
								{stat.value}
							</p>
						</div>
					))}
					{/* Time window switcher inline */}
					<div className="px-4 shrink-0 flex gap-0.5 border-l border-stone-200 dark:border-stone-800">
						{(["7d", "30d", "90d"] as TimeWindow[]).map((value) => (
							<button
								key={value}
								type="button"
								onClick={() => setWindow(value)}
								className={
									window === value
										? "px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-widest bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded"
										: "px-2 py-1 text-[9px] font-mono uppercase tracking-widest text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded transition-colors"
								}
							>
								{value}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Main grid */}
			<div className="grid grid-cols-12 divide-x divide-stone-200 dark:divide-stone-800 h-[calc(100vh-11rem)]">

				{/* Left: Response times table — 5 cols */}
				<div className="col-span-5 flex flex-col overflow-hidden">
					<div className="px-4 py-2.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 shrink-0">
						<p className="text-[9px] font-mono font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
							Response Times by Service
						</p>
					</div>
					<div className="flex-1 overflow-y-auto">
						{/* Table header */}
						<div className="grid grid-cols-5 text-[9px] font-mono font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500 px-4 py-2 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/50">
							<span className="col-span-1">Service</span>
							<span className="text-right">Avg</span>
							<span className="text-right">P50</span>
							<span className="text-right">P95</span>
							<span className="text-right">Rate</span>
						</div>
						{(responseTimesQuery.data?.byService ?? []).map((row) => {
							const cap = Math.max(1, row.p95Minutes ?? row.avgMinutes ?? 1);
							const avgPct = Math.min(100, ((row.avgMinutes ?? 0) / cap) * 100);

							return (
								<div
									key={row.emergencyService}
									className={`border-l-2 ${serviceBorder(row.emergencyService)} border-b border-stone-100 dark:border-stone-800`}
								>
									<div className="grid grid-cols-5 items-center px-4 py-3 text-xs font-mono">
										<span className="col-span-1 font-semibold capitalize text-stone-700 dark:text-stone-300 truncate">
											{row.emergencyService}
										</span>
										<span className="text-right text-stone-600 dark:text-stone-400">{fmtMinutes(row.avgMinutes)}</span>
										<span className="text-right text-stone-600 dark:text-stone-400">{fmtMinutes(row.p50Minutes)}</span>
										<span className="text-right text-stone-600 dark:text-stone-400">{fmtMinutes(row.p95Minutes)}</span>
										<span className="text-right text-stone-500 dark:text-stone-500">
											{typeof row.arrivalRate === "number" ? `${row.arrivalRate.toFixed(0)}%` : "—"}
										</span>
									</div>
									{/* Inline bar */}
									<div className="mx-4 mb-2 h-1 bg-stone-100 dark:bg-stone-800 overflow-hidden">
										<div
											className={`h-full ${serviceTone(row.emergencyService)}`}
											style={{ width: `${avgPct}%` }}
										/>
									</div>
									<p className="px-4 pb-2 text-[9px] font-mono text-stone-400 dark:text-stone-600">
										{row.totalArrived}/{row.totalDispatches} arrived
									</p>
								</div>
							);
						})}
					</div>
				</div>

				{/* Center: Incident status breakdown — 4 cols */}
				<div className="col-span-4 flex flex-col overflow-hidden">
					<div className="px-4 py-2.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 shrink-0">
						<p className="text-[9px] font-mono font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
							Incident Status
						</p>
					</div>
					<div className="flex-1 overflow-y-auto">
						{Array.from(statusCounts.entries()).map(([label, count]) => {
							const pct = incidents.length > 0 ? (count / incidents.length) * 100 : 0;
							return (
								<div
									key={label}
									className="flex items-center gap-4 px-4 py-3 border-b border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors"
								>
									<div className="w-20 shrink-0">
										<p className={`text-xs font-mono font-semibold ${statusColor(label)}`}>
											{label}
										</p>
									</div>
									<div className="flex-1 h-1.5 bg-stone-100 dark:bg-stone-800 overflow-hidden">
										<div
											className="h-full bg-stone-400 dark:bg-stone-500 transition-all"
											style={{ width: `${pct}%` }}
										/>
									</div>
									<span className="w-8 text-right text-xs font-mono font-bold text-stone-700 dark:text-stone-300 shrink-0">
										{count}
									</span>
									<span className="w-10 text-right text-[9px] font-mono text-stone-400 dark:text-stone-600 shrink-0">
										{pct.toFixed(0)}%
									</span>
								</div>
							);
						})}

						{/* Region table */}
						<div className="mt-4 border-t border-stone-200 dark:border-stone-800">
							<div className="px-4 py-2.5 bg-stone-50 dark:bg-stone-950">
								<p className="text-[9px] font-mono font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
									Top Regions
								</p>
							</div>
							{topRegions.length === 0 && (
								<p className="px-4 py-3 text-[10px] font-mono text-stone-400 dark:text-stone-600">
									No data for range.
								</p>
							)}
							{topRegions.map((region, i) => {
								const maxCount = topRegions[0]?.count ?? 1;
								const pct = (region.count / maxCount) * 100;
								return (
									<div
										key={region.region}
										className="flex items-center gap-3 px-4 py-2.5 border-b border-stone-100 dark:border-stone-800"
									>
										<span className="text-[9px] font-mono text-stone-400 w-4 shrink-0">
											{i + 1}
										</span>
										<span className="text-xs font-mono text-stone-600 dark:text-stone-400 flex-1 truncate">
											{region.region}
										</span>
										<div className="w-16 h-1 bg-stone-100 dark:bg-stone-800 overflow-hidden shrink-0">
											<div
												className="h-full bg-stone-400 dark:bg-stone-500"
												style={{ width: `${pct}%` }}
											/>
										</div>
										<span className="text-xs font-mono font-bold text-stone-700 dark:text-stone-300 w-6 text-right shrink-0">
											{region.count}
										</span>
									</div>
								);
							})}
						</div>
					</div>
				</div>

				{/* Right: Fleet status — 3 cols */}
				<div className="col-span-3 flex flex-col overflow-hidden">
					<div className="px-4 py-2.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 shrink-0">
						<p className="text-[9px] font-mono font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
							Fleet Status
						</p>
					</div>
					<div className="flex-1 overflow-y-auto">
						{/* Vehicle status summary */}
						{(["available", "dispatched", "en_route", "on_scene", "returning", "offline"] as const).map((st) => {
							const cnt = vehicles.filter((v) => v.status === st).length;
							const stColor: Record<string, string> = {
								available: "text-emerald-500",
								dispatched: "text-blue-500",
								en_route: "text-cyan-500",
								on_scene: "text-violet-500",
								returning: "text-amber-500",
								offline: "text-stone-400 dark:text-stone-600",
							};
							return (
								<div
									key={st}
									className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100 dark:border-stone-800"
								>
									<span className={`text-xs font-mono font-semibold capitalize ${stColor[st]}`}>
										{st.replace("_", " ")}
									</span>
									<span className="text-sm font-mono font-bold text-stone-700 dark:text-stone-300">
										{cnt}
									</span>
								</div>
							);
						})}

						{/* Active dispatches list */}
						{activeDispatches.length > 0 && (
							<>
								<div className="px-4 py-2.5 bg-stone-50 dark:bg-stone-950 border-t border-b border-stone-200 dark:border-stone-800 mt-2">
									<p className="text-[9px] font-mono font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
										Active Dispatches
									</p>
								</div>
								{activeDispatches.slice(0, 10).map((d) => (
									<div
										key={d.id}
										className="flex items-center justify-between px-4 py-2 border-b border-stone-100 dark:border-stone-800"
									>
										<div>
											<p className="text-[10px] font-mono font-semibold text-stone-600 dark:text-stone-400">
												#{d.incidentId}
											</p>
										</div>
										<span className="text-[9px] font-mono text-stone-400 dark:text-stone-600 uppercase tracking-wider">
											vehicle {d.vehicleId}
										</span>
									</div>
								))}
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
