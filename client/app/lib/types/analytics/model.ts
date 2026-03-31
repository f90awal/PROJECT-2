import type { components, paths } from "./api";

export type AnalyticsRange = components["schemas"]["Range"];
export type ResponseTimesOverall =
	components["schemas"]["ResponseTimesOverall"];
export type ResponseTimesByService =
	components["schemas"]["ResponseTimesByServiceItem"];
export type IncidentsByRegionItem =
	components["schemas"]["IncidentsByRegionItem"];
export type BedUsage = components["schemas"]["BedUsage"];
export type TopResponder = components["schemas"]["TopResponder"];

export type ResponseTimesResponse =
	paths["/response-times"]["get"]["responses"][200]["content"]["application/json"];
export type IncidentsByRegionResponse =
	paths["/incidents-by-region"]["get"]["responses"][200]["content"]["application/json"];
export type ResourceUtilizationResponse =
	paths["/resource-utilization"]["get"]["responses"][200]["content"]["application/json"];

export type ResponseTimesQuery =
	paths["/response-times"]["get"]["parameters"]["query"];
export type IncidentsByRegionQuery =
	paths["/incidents-by-region"]["get"]["parameters"]["query"];
export type ResourceUtilizationQuery =
	paths["/resource-utilization"]["get"]["parameters"]["query"];
