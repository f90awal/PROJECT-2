import type { components, paths } from "./api";

export type DispatchVehicleType = components["schemas"]["VehicleType"];
export type DispatchVehicleStatus = components["schemas"]["VehicleStatus"];
export type DispatchStatus = components["schemas"]["DispatchStatus"];
export type DispatchStationType = components["schemas"]["StationType"];

export type ResourceLocation = components["schemas"]["ResourceLocation"];
export type DispatchStation = components["schemas"]["Station"];
export type DispatchDriver = components["schemas"]["Driver"];
export type DispatchVehicleLocation = components["schemas"]["VehicleLocation"];
export type DispatchVehicle = components["schemas"]["Vehicle"];
export type ActiveDispatch = components["schemas"]["Dispatch"];

export type RegisterVehiclePayload =
	components["schemas"]["RegisterVehicleRequest"];
export type RegisterDriverPayload =
	components["schemas"]["RegisterDriverRequest"];
export type UpdateVehicleLocationRequest =
	components["schemas"]["UpdateVehicleLocationRequest"];

export type VehiclesResponse =
	paths["/vehicles"]["get"]["responses"][200]["content"]["application/json"];
export type StationsResponse =
	paths["/stations"]["get"]["responses"][200]["content"]["application/json"];
export type ActiveDispatchesResponse =
	paths["/dispatches/active"]["get"]["responses"][200]["content"]["application/json"];

export type UpdateVehicleLocationPayload = UpdateVehicleLocationRequest & {
	id: number;
};

export type CreateStationPayload =
	components["schemas"]["RegisterStationRequest"];
export type StationBootstrapResponse =
	components["schemas"]["StationBootstrapResponse"];
export type SeedStationsPayload = components["schemas"]["SeedStationsRequest"];
export type SeedStationsResponse =
	components["schemas"]["SeedStationsResponse"];
