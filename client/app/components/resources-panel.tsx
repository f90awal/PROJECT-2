import { useSetAtom } from "jotai";
import React from "react";
import { resourceFocusRequestAtom } from "~/lib/store";
import { useDispatchResources } from "~/lib/use-dispatch";

const statusClass: Record<string, string> = {
	available:
		"bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
	dispatched:
		"bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
	en_route:
		"bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-800",
	on_scene:
		"bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800",
	returning:
		"bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
	offline:
		"bg-stone-100 text-stone-600 border border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700",
};

export function ResourcesPanel() {
	const { vehicles, activeDispatches, isLoading, arrive, seed } =
		useDispatchResources();
	const requestResourceFocus = useSetAtom(resourceFocusRequestAtom);
	const [expandedStationId, setExpandedStationId] = React.useState<
		number | null
	>(null);

	const activeDispatchByVehicleId = React.useMemo(() => {
		return new Map(activeDispatches.map((item) => [item.vehicleId, item]));
	}, [activeDispatches]);

	const stationGroups = React.useMemo(() => {
		const grouped = new Map<
			number,
			{
				stationId: number;
				stationName: string;
				stationType: string;
				vehicles: typeof vehicles;
			}
		>();

		for (const vehicle of vehicles) {
			if (!vehicle.stationId) continue;

			const existing = grouped.get(vehicle.stationId);
			if (existing) {
				existing.vehicles.push(vehicle);
				continue;
			}

			grouped.set(vehicle.stationId, {
				stationId: vehicle.stationId,
				stationName: vehicle.station?.name ?? `Station #${vehicle.stationId}`,
				stationType: vehicle.station?.type ?? "unknown",
				vehicles: [vehicle],
			});
		}

		return Array.from(grouped.values()).sort((a, b) =>
			a.stationName.localeCompare(b.stationName),
		);
	}, [vehicles]);

	const stationHealth = React.useMemo(() => {
		return stationGroups.map((station) => {
			const totals = {
				available: 0,
				dispatched: 0,
				en_route: 0,
				on_scene: 0,
				returning: 0,
				offline: 0,
				activeDispatches: 0,
			};

			for (const vehicle of station.vehicles) {
				totals[vehicle.status] += 1;
				if (activeDispatchByVehicleId.has(vehicle.id)) {
					totals.activeDispatches += 1;
				}
			}

			return {
				...station,
				...totals,
				total: station.vehicles.length,
			};
		});
	}, [activeDispatchByVehicleId, stationGroups]);

	if (isLoading) {
		return (
			<div className="h-full flex flex-col items-center justify-center gap-2 py-8">
				<div className="i-solar-refresh-bold-duotone size-8 text-stone-300 dark:text-stone-700 animate-spin" />
				<p className="text-xs font-mono text-stone-400">loading...</p>
			</div>
		);
	}

	if (vehicles.length === 0) {
		return (
			<div className="h-full flex flex-col items-center justify-center gap-3 py-8 text-center">
				<div className="i-solar-box-linear size-8 text-stone-300 dark:text-stone-700" />
				<div>
					<p className="text-xs font-mono font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-600">
						No responders
					</p>
					<p className="text-xs font-mono text-stone-400 dark:text-stone-700 mt-1">
						create a station or seed demo
					</p>
				</div>
				<button
					type="button"
					onClick={() => seed.mutate({ reset: true, profile: "full" })}
					disabled={seed.isPending}
					className="rounded px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-white disabled:opacity-60 transition-colors"
				>
					{seed.isPending ? "Seeding..." : "Seed Demo"}
				</button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<p className="text-xs font-mono text-stone-400 dark:text-stone-500">
					{activeDispatches.length} / {vehicles.length} dispatched
				</p>
				<button
					type="button"
					onClick={() => seed.mutate({ reset: true, profile: "full" })}
					disabled={seed.isPending}
					className="rounded px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-300 dark:hover:bg-stone-700 disabled:opacity-60 transition-colors"
				>
					{seed.isPending ? "Seeding..." : "Reset"}
				</button>
			</div>

			<div className="flex flex-col gap-1.5">
				{stationHealth.map((station) => {
					const isExpanded = expandedStationId === station.stationId;

					return (
						<div
							key={station.stationId}
							className="rounded border border-stone-200 dark:border-stone-800 overflow-hidden"
						>
							<button
								type="button"
								onClick={() =>
									setExpandedStationId(isExpanded ? null : station.stationId)
								}
								className="w-full text-left px-3 py-2 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
							>
								<div className="flex items-center justify-between gap-2">
									<div>
										<p className="text-xs font-mono font-semibold text-stone-800 dark:text-stone-200">
											{station.stationName}
										</p>
										<p className="text-[10px] font-mono text-stone-400 dark:text-stone-500 capitalize">
											{station.stationType}
										</p>
									</div>
									<div className="text-right">
										<p className="text-xs font-mono text-stone-600 dark:text-stone-400">
											{station.total}
										</p>
										<p className="text-[10px] font-mono text-stone-400 dark:text-stone-500">
											{station.activeDispatches} active
										</p>
									</div>
								</div>

								<div className="mt-2 grid grid-cols-4 gap-1 text-[9px] font-mono">
									<span className="rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 py-0.5 text-center">
										A {station.available}
									</span>
									<span className="rounded bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 py-0.5 text-center">
										M {station.dispatched + station.en_route + station.returning}
									</span>
									<span className="rounded bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 px-1.5 py-0.5 text-center">
										S {station.on_scene}
									</span>
									<span className="rounded bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400 px-1.5 py-0.5 text-center">
										O {station.offline}
									</span>
								</div>
							</button>

							{isExpanded && (
								<ul className="divide-y divide-stone-100 dark:divide-stone-800">
									{station.vehicles.map((vehicle) => {
										const activeDispatch = activeDispatchByVehicleId.get(
											vehicle.id,
										);
										const markerStatus = vehicle.status;
										const canArrive = Boolean(
											activeDispatch && markerStatus !== "on_scene",
										);
										const sc = statusClass[vehicle.status] ?? statusClass.offline;

										return (
											// biome-ignore lint/a11y/useKeyWithClickEvents: list item works as a map focus trigger
											<li
												key={vehicle.id}
												className="group flex items-center gap-2 px-3 py-2 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
												onClick={() =>
													requestResourceFocus({
														vehicleId: vehicle.id,
														requestId: Date.now(),
													})
												}
											>
												<div className="min-w-0 flex-1">
													<div className="flex items-center gap-1.5">
														<span
															className={`inline-flex rounded px-1.5 py-px text-[9px] font-mono font-semibold uppercase tracking-wide ${sc}`}
														>
															{vehicle.status.replace("_", " ")}
														</span>
														<span className="text-[10px] font-mono text-stone-400 dark:text-stone-600 truncate">
															{vehicle.callSign}
														</span>
													</div>
													{activeDispatch && (
														<p className="mt-0.5 text-[10px] font-mono text-stone-400 dark:text-stone-500 truncate">
															→ incident #{activeDispatch.incidentId}
														</p>
													)}
												</div>

												{canArrive && (
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															arrive.mutate({ id: activeDispatch!.id });
														}}
														disabled={arrive.isPending}
														className="shrink-0 rounded px-2 py-0.5 text-[9px] font-mono font-semibold bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-60 transition-colors"
													>
														Arrive
													</button>
												)}
											</li>
										);
									})}
								</ul>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
