import type { components, paths } from "./api";

export type Incident = components["schemas"]["Incident"];
export type NearbyIncident = components["schemas"]["NearbyIncident"];

export type CreateIncidentPayload =
	components["schemas"]["CreateIncidentRequest"];
export type UpdateIncidentStatusPayload =
	components["schemas"]["UpdateStatusRequest"];

export type IncidentListResponse =
	components["schemas"]["IncidentListResponse"];
export type IncidentItemsResponse =
	components["schemas"]["IncidentItemsResponse"];
export type NearbyIncidentsResponse =
	components["schemas"]["NearbyIncidentsResponse"];

export type ListIncidentsQuery = NonNullable<
	paths["/"]["get"]["parameters"]["query"]
>;
