import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import {
	fetchActiveDispatches,
	fetchStations,
	fetchVehicles,
	markDispatchArrived,
	registerStation,
	seedStations,
} from "~/lib/dispatch";
import type { Incident, IncidentListResponse } from "~/lib/types";
import type {
	CreateStationPayload,
	DispatchVehicle,
	SeedStationsPayload,
} from "~/lib/types/dispatch/model";

type TrackingEvent = {
	type?: string;
	vehicleId?: number;
	lat?: number;
	lng?: number;
	speed?: number | null;
	heading?: number | null;
	recordedAt?: string;
	incidentId?: string | number;
	dispatchId?: number;
	vehicleStatus?: string;
};

function shouldInvalidateIncidents(eventType: string) {
	return (
		eventType === "dispatch.vehicle.dispatched" ||
		eventType === "dispatch.vehicle.arrived" ||
		eventType === "dispatch.vehicle.cleared"
	);
}

function shouldInvalidateDispatch(eventType: string) {
	return (
		eventType === "dispatch.vehicle.dispatched" ||
		eventType === "dispatch.vehicle.arrived" ||
		eventType === "dispatch.vehicle.cleared"
	);
}

function toIncidentNumericId(value: unknown) {
	if (typeof value === "number" && Number.isInteger(value) && value > 0) {
		return value;
	}

	if (typeof value === "string" && value.trim().length > 0) {
		const parsed = Number.parseInt(value, 10);
		if (Number.isInteger(parsed) && parsed > 0) return parsed;
	}

	return null;
}

function patchIncidentStatusInCache(
	queryClient: ReturnType<typeof useQueryClient>,
	incidentId: number,
	status: Incident["status"],
) {
	queryClient.setQueriesData(
		{ queryKey: ["incidents"] },
		(current: IncidentListResponse | undefined) => {
			if (!current?.items?.length) return current;

			const items = current.items.map((item) =>
				item.id === incidentId ? { ...item, status } : item,
			);

			return { ...current, items };
		},
	);
}

export function useDispatchLiveSync() {
	const queryClient = useQueryClient();

	React.useEffect(() => {
		let retryTimer: ReturnType<typeof setTimeout> | null = null;
		let source: EventSource | null = null;

		const connect = () => {
			source = new EventSource("/dispatch?scope=tracking-live");

			source.onmessage = (event) => {
				let parsed: TrackingEvent;
				try {
					parsed = JSON.parse(event.data) as TrackingEvent;
				} catch {
					return;
				}

				if (parsed.type === "vehicle.location.updated") {
					if (
						!Number.isFinite(parsed.vehicleId) ||
						!Number.isFinite(parsed.lat) ||
						!Number.isFinite(parsed.lng)
					) {
						return;
					}

					let didMatch = false;
					const updated = queryClient.setQueryData<DispatchVehicle[]>(
						["dispatch", "vehicles"],
						(current) => {
							if (!current?.length) return current;

							const next = current.map((vehicle) => {
								if (vehicle.id !== parsed.vehicleId) return vehicle;
								didMatch = true;

								const existingLocations = vehicle.locations ?? [];
								const nextLocation = {
									id: existingLocations[0]?.id ?? -1,
									vehicleId: vehicle.id,
									lat: parsed.lat as number,
									lng: parsed.lng as number,
									speed: typeof parsed.speed === "number" ? parsed.speed : null,
									heading:
										typeof parsed.heading === "number" ? parsed.heading : null,
									recordedAt: parsed.recordedAt ?? new Date().toISOString(),
								};

								return {
									...vehicle,
									status:
										typeof parsed.vehicleStatus === "string"
											? (parsed.vehicleStatus as DispatchVehicle["status"])
											: vehicle.status,
									locations: [nextLocation, ...existingLocations.slice(0, 9)],
								};
							});

							return didMatch ? next : current;
						},
					);

					if (!updated || !didMatch) {
						queryClient.invalidateQueries({
							queryKey: ["dispatch", "vehicles"],
						});
					}

					return;
				}

				const eventType = parsed.type ?? "";
				if (!eventType) return;

				if (
					(parsed.type === "dispatch.vehicle.dispatched" ||
						parsed.type === "dispatch.vehicle.arrived" ||
						parsed.type === "dispatch.vehicle.cleared") &&
					Number.isFinite(parsed.vehicleId) &&
					typeof parsed.vehicleStatus === "string"
				) {
					queryClient.setQueryData<DispatchVehicle[]>(
						["dispatch", "vehicles"],
						(current) => {
							if (!current?.length) return current;
							return current.map((vehicle) =>
								vehicle.id === parsed.vehicleId
									? {
											...vehicle,
											status: parsed.vehicleStatus as DispatchVehicle["status"],
										}
									: vehicle,
							);
						},
					);
				}

				const incidentId = toIncidentNumericId(parsed.incidentId);
				if (incidentId) {
					if (parsed.type === "dispatch.vehicle.dispatched") {
						patchIncidentStatusInCache(queryClient, incidentId, "dispatched");
					}
					if (parsed.type === "dispatch.vehicle.arrived") {
						patchIncidentStatusInCache(queryClient, incidentId, "in_progress");
					}
				}

				if (shouldInvalidateDispatch(eventType)) {
					queryClient.invalidateQueries({ queryKey: ["dispatch"] });
				}

				if (shouldInvalidateIncidents(eventType)) {
					queryClient.invalidateQueries({ queryKey: ["incidents"] });
				}
			};

			source.onerror = () => {
				source?.close();
				retryTimer = setTimeout(() => {
					queryClient.invalidateQueries({ queryKey: ["dispatch", "vehicles"] });
					connect();
				}, 1000);
			};
		};

		connect();

		const pollingFallback = setInterval(() => {
			queryClient.invalidateQueries({ queryKey: ["dispatch", "vehicles"] });
		}, 10000);

		return () => {
			if (retryTimer) clearTimeout(retryTimer);
			clearInterval(pollingFallback);
			source?.close();
		};
	}, [queryClient]);
}

export function useDispatchResources(enabled = true) {
	const queryClient = useQueryClient();

	const vehiclesQuery = useQuery({
		queryKey: ["dispatch", "vehicles"],
		queryFn: fetchVehicles,
		enabled,
	});

	const activeDispatchesQuery = useQuery({
		queryKey: ["dispatch", "active-dispatches"],
		queryFn: fetchActiveDispatches,
		enabled,
	});

	const stationsQuery = useQuery({
		queryKey: ["dispatch", "stations"],
		queryFn: fetchStations,
		enabled,
	});

	const create = useMutation({
		mutationFn: (payload: CreateStationPayload) => registerStation(payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["dispatch"] });
		},
	});

	const seed = useMutation({
		mutationFn: (payload?: SeedStationsPayload) => seedStations(payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["dispatch"] });
			queryClient.invalidateQueries({ queryKey: ["incidents"] });
		},
	});

	const arrive = useMutation({
		mutationFn: ({ id }: { id: number }) => markDispatchArrived(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["dispatch"] });
			queryClient.invalidateQueries({ queryKey: ["incidents"] });
		},
	});

	return {
		vehicles: vehiclesQuery.data ?? [],
		stations: stationsQuery.data ?? [],
		activeDispatches: activeDispatchesQuery.data ?? [],
		isLoading:
			vehiclesQuery.isLoading ||
			activeDispatchesQuery.isLoading ||
			stationsQuery.isLoading,
		vehiclesQuery,
		stationsQuery,
		activeDispatchesQuery,
		create,
		seed,
		arrive,
	};
}
