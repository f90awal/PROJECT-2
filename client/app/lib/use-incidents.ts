import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createIncident,
	fetchIncidents,
	resolveIncidentStatus,
} from "~/lib/incidents";
import type {
	CreateIncidentPayload,
	ListIncidentsQuery,
	UpdateIncidentStatusPayload,
} from "~/lib/types";

export function useIncidents(
	query?: Partial<ListIncidentsQuery>,
	enabled = true,
) {
	const queryClient = useQueryClient();

	const incidentsQuery = useQuery({
		queryKey: ["incidents", query],
		queryFn: () => fetchIncidents(query),
		enabled,
	});

	const create = useMutation({
		mutationFn: (payload: CreateIncidentPayload) => createIncident(payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["incidents"] });
		},
	});

	const resolve = useMutation({
		mutationFn: ({
			id,
			status,
		}: {
			id: number;
			status: UpdateIncidentStatusPayload["status"];
		}) => resolveIncidentStatus({ id, status }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["incidents"] });
		},
	});

	return {
		...incidentsQuery,
		items: incidentsQuery.data?.items ?? [],
		create,
		resolve,
	};
}

export function useOpenIncidents(enabled = true) {
	const query = useIncidents(undefined, enabled);
	const items = query.items.filter(
		(incident) => !["resolved", "cancelled"].includes(incident.status),
	);

	return {
		...query,
		items,
	};
}
