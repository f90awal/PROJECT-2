import React from "react";
import { type TimeWindow, useAnalytics } from "~/lib/use-analytics";

function fmtMinutes(value: number | null | undefined) {
	if (typeof value !== "number" || !Number.isFinite(value)) return "—";
	return `${value.toFixed(2)} min`;
}

function serviceGlyph(service: string) {
	if (service === "ambulance") return "i-solar-ambulance-bold-duotone";
	if (service === "fire") return "i-solar-fire-bold-duotone";
	if (service === "police") return "i-solar-shield-keyhole-bold-duotone";
	return "i-solar-siren-bold-duotone";
}

function serviceAccent(service: string) {
	if (service === "ambulance") return "text-blue-400";
	if (service === "fire") return "text-orange-400";
	if (service === "police") return "text-indigo-400";
	return "text-stone-400";
}

type Section = "response" | "capacity" | "incidents" | "responders";

const sections: { id: Section; label: string; icon: string }[] = [
	{ id: "response", label: "Response Times", icon: "i-solar-clock-circle-bold-duotone" },
	{ id: "capacity", label: "Hospital Capacity", icon: "i-solar-hospital-bold-duotone" },
	{ id: "incidents", label: "Incident Mix", icon: "i-solar-danger-triangle-bold-duotone" },
	{ id: "responders", label: "Top Responders", icon: "i-solar-user-bold-duotone" },
];

export function AnalyticsPanel() {
	const [timeWindow, setTimeWindow] = React.useState<TimeWindow>("30d");
	const [activeSection, setActiveSection] = React.useState<Section>("response");
	const {
		responseTimesQuery,
		incidentsByRegionQuery,
		resourceUtilizationQuery,
		isLoading,
		isError,
		error,
	} = useAnalytics(timeWindow);

	const incidentTypeShare = React.useMemo(() => {
		const grouped = new Map<string, number>();
		for (const row of incidentsByRegionQuery.data?.breakdown ?? []) {
			grouped.set(
				row.incidentType,
				(grouped.get(row.incidentType) ?? 0) + row.count,
			);
		}
		return Array.from(grouped.entries())
			.map(([incidentType, count]) => ({ incidentType, count }))
			.sort((a, b) => b.count - a.count);
	}, [incidentsByRegionQuery.data]);

	const bedUsage = resourceUtilizationQuery.data?.bedUsage;
	const topResponders = resourceUtilizationQuery.data?.topRespondersByService ?? {};

	if (isLoading) {
		return (
			<div className="h-full flex flex-col items-center justify-center gap-2">
				<div className="i-solar-refresh-bold-duotone size-8 text-stone-300 dark:text-stone-700 animate-spin" />
				<p className="text-xs font-mono text-stone-400">loading analytics...</p>
			</div>
		);
	}

	if (isError) {
		return (
			<div className="h-full flex flex-col items-center justify-center gap-2 text-center">
				<div className="i-solar-danger-bold-duotone size-8 text-red-400" />
				<p className="text-xs font-mono font-semibold uppercase tracking-wider text-stone-500">
					Analytics unavailable
				</p>
				<p className="text-xs font-mono text-stone-400 max-w-xs">
					{error instanceof Error ? error.message : "Verify analytics service."}
				</p>
			</div>
		);
	}

	return (
		<div className="flex h-[calc(100vh-2.75rem)]">
			{/* Left sidebar — dark, navigation + context */}
			<aside className="w-56 shrink-0 bg-stone-900 dark:bg-stone-950 border-r border-stone-800 flex flex-col">
				{/* Time window */}
				<div className="px-4 py-4 border-b border-stone-800">
					<p className="text-[9px] font-mono uppercase tracking-widest text-stone-500 mb-2">
						Period
					</p>
					<div className="flex flex-col gap-1">
						{(["7d", "30d", "90d"] as TimeWindow[]).map((value) => (
							<button
								key={value}
								type="button"
								onClick={() => setTimeWindow(value)}
								className={
									timeWindow === value
										? "text-left px-3 py-1.5 rounded text-xs font-mono font-bold text-stone-100 bg-stone-700 uppercase tracking-wider"
										: "text-left px-3 py-1.5 rounded text-xs font-mono text-stone-500 hover:text-stone-300 hover:bg-stone-800 uppercase tracking-wider transition-colors"
								}
							>
								{value === "7d" ? "Last 7 days" : value === "30d" ? "Last 30 days" : "Last 90 days"}
							</button>
						))}
					</div>
				</div>

				{/* Section nav */}
				<div className="px-4 py-4 border-b border-stone-800 flex-1">
					<p className="text-[9px] font-mono uppercase tracking-widest text-stone-500 mb-2">
						Metrics
					</p>
					<nav className="flex flex-col gap-0.5">
						{sections.map((s) => (
							<button
								key={s.id}
								type="button"
								onClick={() => setActiveSection(s.id)}
								className={
									activeSection === s.id
										? "flex items-center gap-2.5 px-3 py-2 rounded text-xs font-mono font-semibold text-stone-100 bg-stone-700 border-l-2 border-l-orange-400 text-left"
										: "flex items-center gap-2.5 px-3 py-2 rounded text-xs font-mono text-stone-500 hover:text-stone-300 hover:bg-stone-800 text-left transition-colors"
								}
							>
								<div className={`${s.icon} size-4 shrink-0`} />
								{s.label}
							</button>
						))}
					</nav>
				</div>

				{/* Summary numbers */}
				<div className="px-4 py-4 space-y-3">
					<div>
						<p className="text-[9px] font-mono uppercase tracking-widest text-stone-600 mb-0.5">Total Incidents</p>
						<p className="text-xl font-mono font-bold text-stone-300">
							{incidentsByRegionQuery.data?.totalIncidents ?? "—"}
						</p>
					</div>
					<div>
						<p className="text-[9px] font-mono uppercase tracking-widest text-stone-600 mb-0.5">Hospitals</p>
						<p className="text-xl font-mono font-bold text-stone-300">
							{resourceUtilizationQuery.data?.hospitalsConsidered ?? "—"}
						</p>
					</div>
				</div>
			</aside>

			{/* Right content area */}
			<main className="flex-1 overflow-y-auto bg-stone-50 dark:bg-stone-950 p-6">

				{/* Response Times */}
				{activeSection === "response" && (
					<div>
						<h2 className="text-sm font-mono font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-5">
							Response Time Distribution
						</h2>
						<div className="space-y-4">
							{(responseTimesQuery.data?.byService ?? []).map((service) => {
								const maxVal = Math.max(1, service.p95Minutes ?? service.avgMinutes ?? 1);
								return (
									<div key={service.emergencyService} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
										{/* Service header */}
										<div className="flex items-center justify-between px-5 py-3 border-b border-stone-100 dark:border-stone-800">
											<div className="flex items-center gap-2.5">
												<div className={`${serviceGlyph(service.emergencyService)} size-5 ${serviceAccent(service.emergencyService)}`} />
												<p className="text-sm font-mono font-semibold capitalize text-stone-800 dark:text-stone-200">
													{service.emergencyService.replace("_", " ")}
												</p>
											</div>
											<p className="text-xs font-mono text-stone-400">
												{service.totalArrived}/{service.totalDispatches} arrived
											</p>
										</div>

										{/* Stats grid */}
										<div className="grid grid-cols-4 divide-x divide-stone-100 dark:divide-stone-800">
											{[
												{ label: "Average", value: fmtMinutes(service.avgMinutes), raw: service.avgMinutes },
												{ label: "Median (P50)", value: fmtMinutes(service.p50Minutes), raw: service.p50Minutes },
												{ label: "P95 Tail", value: fmtMinutes(service.p95Minutes), raw: service.p95Minutes },
												{
													label: "Arrival Rate",
													value: typeof service.arrivalRate === "number" ? `${service.arrivalRate.toFixed(1)}%` : "—",
													raw: null,
												},
											].map((stat) => (
												<div key={stat.label} className="px-4 py-3">
													<p className="text-[9px] font-mono uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1">
														{stat.label}
													</p>
													<p className="text-lg font-mono font-bold text-stone-800 dark:text-stone-100">
														{stat.value}
													</p>
													{stat.raw != null && (
														<div className="mt-1.5 h-1 bg-stone-100 dark:bg-stone-800 overflow-hidden">
															<div
																className={`h-full ${serviceAccent(service.emergencyService).replace("text-", "bg-")}`}
																style={{ width: `${Math.min(100, (stat.raw / maxVal) * 100)}%` }}
															/>
														</div>
													)}
												</div>
											))}
										</div>
									</div>
								);
							})}
							{(responseTimesQuery.data?.byService ?? []).length === 0 && (
								<p className="text-xs font-mono text-stone-400">No response time data for this period.</p>
							)}
						</div>
					</div>
				)}

				{/* Hospital Capacity */}
				{activeSection === "capacity" && (
					<div>
						<h2 className="text-sm font-mono font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-5">
							Hospital Capacity
						</h2>
						<div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
							<div className="grid grid-cols-3 divide-x divide-stone-100 dark:divide-stone-800 border-b border-stone-100 dark:border-stone-800">
								{[
									{ label: "Total Beds", value: bedUsage?.totalBeds ?? 0, color: "text-stone-700 dark:text-stone-200" },
									{ label: "Available", value: bedUsage?.availableBeds ?? 0, color: "text-emerald-600" },
									{ label: "In Use", value: bedUsage?.usedBeds ?? 0, color: "text-amber-600" },
								].map((stat) => (
									<div key={stat.label} className="px-5 py-4">
										<p className="text-[9px] font-mono uppercase tracking-widest text-stone-400 mb-1">{stat.label}</p>
										<p className={`text-3xl font-mono font-bold ${stat.color}`}>{stat.value}</p>
									</div>
								))}
							</div>
							<div className="px-5 py-4">
								<div className="flex items-center justify-between mb-2">
									<p className="text-[9px] font-mono uppercase tracking-widest text-stone-400">Bed Usage Rate</p>
									<p className="text-sm font-mono font-bold text-stone-700 dark:text-stone-200">
										{typeof bedUsage?.usageRatePercent === "number"
											? `${bedUsage.usageRatePercent.toFixed(1)}%`
											: "—"}
									</p>
								</div>
								<div className="h-3 bg-stone-100 dark:bg-stone-800 overflow-hidden">
									<div
										className="h-full bg-emerald-500 transition-all"
										style={{ width: `${Math.max(0, Math.min(100, bedUsage?.usageRatePercent ?? 0))}%` }}
									/>
								</div>
								<p className="mt-3 text-xs font-mono text-stone-400">
									{resourceUtilizationQuery.data?.hospitalsConsidered ?? 0} hospitals surveyed
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Incident Mix */}
				{activeSection === "incidents" && (
					<div>
						<h2 className="text-sm font-mono font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-5">
							Incident Type Mix
						</h2>
						{incidentTypeShare.length === 0 ? (
							<p className="text-xs font-mono text-stone-400">No incident data for this period.</p>
						) : (
							<div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
								{/* Header */}
								<div className="grid grid-cols-12 px-5 py-2 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-[9px] font-mono font-bold uppercase tracking-widest text-stone-400">
									<span className="col-span-3">Type</span>
									<span className="col-span-6">Distribution</span>
									<span className="col-span-2 text-right">Count</span>
									<span className="col-span-1 text-right">%</span>
								</div>
								{incidentTypeShare.map((row, i) => {
									const total = incidentsByRegionQuery.data?.totalIncidents ?? 0;
									const pct = total > 0 ? (row.count / total) * 100 : 0;
									const maxCount = incidentTypeShare[0]?.count ?? 1;
									const barPct = (row.count / maxCount) * 100;
									return (
										<div
											key={row.incidentType}
											className={`grid grid-cols-12 items-center px-5 py-3 ${i < incidentTypeShare.length - 1 ? "border-b border-stone-100 dark:border-stone-800" : ""}`}
										>
											<span className="col-span-3 text-xs font-mono font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
												{row.incidentType}
											</span>
											<div className="col-span-6 h-2 bg-stone-100 dark:bg-stone-800 overflow-hidden">
												<div
													className="h-full bg-stone-500 dark:bg-stone-400"
													style={{ width: `${barPct}%` }}
												/>
											</div>
											<span className="col-span-2 text-right text-sm font-mono font-bold text-stone-700 dark:text-stone-200">
												{row.count}
											</span>
											<span className="col-span-1 text-right text-xs font-mono text-stone-400 dark:text-stone-500">
												{pct.toFixed(0)}%
											</span>
										</div>
									);
								})}
							</div>
						)}
					</div>
				)}

				{/* Top Responders */}
				{activeSection === "responders" && (
					<div>
						<h2 className="text-sm font-mono font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-5">
							Top Responders
						</h2>
						{Object.keys(topResponders).length === 0 ? (
							<p className="text-xs font-mono text-stone-400">No responder data for this period.</p>
						) : (
							<div className="space-y-4">
								{Object.entries(topResponders).map(([service, responders]) => {
									const rs = responders as Array<{ responderId: string; responderName: string | null; deployments: number }>;
									return (
										<div key={service} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
											<div className="flex items-center gap-2.5 px-5 py-3 border-b border-stone-100 dark:border-stone-800">
												<div className={`${serviceGlyph(service)} size-4 ${serviceAccent(service)}`} />
												<p className="text-xs font-mono font-semibold capitalize text-stone-700 dark:text-stone-300 uppercase tracking-wider">
													{service}
												</p>
											</div>
											{/* Table header */}
											<div className="grid grid-cols-12 px-5 py-2 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-[9px] font-mono font-bold uppercase tracking-widest text-stone-400">
												<span className="col-span-1">#</span>
												<span className="col-span-7">Responder</span>
												<span className="col-span-4 text-right">Deployments</span>
											</div>
											{rs.map((r, i) => {
												const maxDep = rs[0]?.deployments ?? 1;
												const pct = (r.deployments / maxDep) * 100;
												return (
													<div
														key={r.responderId}
														className={`grid grid-cols-12 items-center px-5 py-2.5 ${i < rs.length - 1 ? "border-b border-stone-100 dark:border-stone-800" : ""}`}
													>
														<span className="col-span-1 text-[9px] font-mono text-stone-400">{i + 1}</span>
														<div className="col-span-7">
															<p className="text-xs font-mono text-stone-700 dark:text-stone-300 truncate">
																{r.responderName ?? r.responderId}
															</p>
															<div className="mt-1 h-1 w-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
																<div
																	className={`h-full ${serviceAccent(service).replace("text-", "bg-")}`}
																	style={{ width: `${pct}%` }}
																/>
															</div>
														</div>
														<span className="col-span-4 text-right text-sm font-mono font-bold text-stone-700 dark:text-stone-200">
															{r.deployments}
														</span>
													</div>
												);
											})}
										</div>
									);
								})}
							</div>
						)}
					</div>
				)}
			</main>
		</div>
	);
}
