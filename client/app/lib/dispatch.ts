import type {
	ActiveDispatch,
	CreateStationPayload,
	DispatchStation,
	DispatchVehicle,
	RegisterDriverPayload,
	RegisterVehiclePayload,
	SeedStationsPayload,
	SeedStationsResponse,
	StationBootstrapResponse,
	UpdateVehicleLocationPayload,
} from "~/lib/types/dispatch/model";

async function parseJsonResponse<T>(response: Response): Promise<T> {
	const data = await response.json();

	if (!response.ok) {
		const message = data?.detail || "Request failed";
		throw new Error(message);
	}

	return data as T;
}

export async function fetchVehicles(): Promise<DispatchVehicle[]> {
	const response = await fetch("/dispatch?scope=vehicles", {
		method: "GET",
		credentials: "include",
	});

	return parseJsonResponse<DispatchVehicle[]>(response);
}

export async function fetchActiveDispatches(): Promise<ActiveDispatch[]> {
	const response = await fetch("/dispatch?scope=dispatches-active", {
		method: "GET",
		credentials: "include",
	});

	return parseJsonResponse<ActiveDispatch[]>(response);
}

export async function fetchStations(): Promise<DispatchStation[]> {
	const response = await fetch("/dispatch?scope=stations", {
		method: "GET",
		credentials: "include",
	});

	return parseJsonResponse<DispatchStation[]>(response);
}

export async function registerVehicle(
	payload: RegisterVehiclePayload,
): Promise<DispatchVehicle> {
	const response = await fetch("/dispatch", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify({ action: "vehicle-register", payload }),
	});

	return parseJsonResponse<DispatchVehicle>(response);
}

export async function registerDriver(
	payload: RegisterDriverPayload,
): Promise<DispatchVehicle["driver"]> {
	const response = await fetch("/dispatch", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify({ action: "driver-register", payload }),
	});

	return parseJsonResponse<DispatchVehicle["driver"]>(response);
}

export async function updateVehicleLocation(
	payload: UpdateVehicleLocationPayload,
) {
	const response = await fetch("/dispatch", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify({ action: "vehicle-location", payload }),
	});

	return parseJsonResponse<Record<string, unknown>>(response);
}

export async function registerStation(
	payload: CreateStationPayload,
): Promise<StationBootstrapResponse> {
	const response = await fetch("/dispatch", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify({ action: "station-register", payload }),
	});

	return parseJsonResponse<StationBootstrapResponse>(response);
}

export async function seedStations(
	payload?: SeedStationsPayload,
): Promise<SeedStationsResponse> {
	const response = await fetch("/dispatch", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify({ action: "stations-seed", payload: payload ?? {} }),
	});

	return parseJsonResponse<SeedStationsResponse>(response);
}

export async function markDispatchArrived(id: number): Promise<ActiveDispatch> {
	const response = await fetch("/dispatch", {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify({ action: "dispatch-arrive", payload: { id } }),
	});

	return parseJsonResponse<ActiveDispatch>(response);
}
