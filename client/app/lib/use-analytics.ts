import { useQuery } from "@tanstack/react-query";
import {
	fetchIncidentsByRegion,
	fetchResourceUtilization,
	fetchResponseTimes,
} from "~/lib/analytics";

type TimeWindow = "7d" | "30d" | "90d";

function toIsoRange(window: TimeWindow) {
	const now = new Date();
	const from = new Date(now);

	if (window === "7d") from.setDate(from.getDate() - 7);
	if (window === "30d") from.setDate(from.getDate() - 30);
	if (window === "90d") from.setDate(from.getDate() - 90);

	return {
		from: from.toISOString(),
		to: now.toISOString(),
	};
}

export function useAnalytics(window: TimeWindow = "30d") {
	const responseTimesQuery = useQuery({
		queryKey: ["analytics", "response-times", window],
		queryFn: () => fetchResponseTimes(toIsoRange(window)),
		refetchInterval: 15000,
	});

	const incidentsByRegionQuery = useQuery({
		queryKey: ["analytics", "incidents-by-region", window],
		queryFn: () => fetchIncidentsByRegion(toIsoRange(window)),
		refetchInterval: 15000,
	});

	const resourceUtilizationQuery = useQuery({
		queryKey: ["analytics", "resource-utilization", window, 6],
		queryFn: () => fetchResourceUtilization({ ...toIsoRange(window), top: 6 }),
		refetchInterval: 15000,
	});

	return {
		responseTimesQuery,
		incidentsByRegionQuery,
		resourceUtilizationQuery,
		isLoading:
			responseTimesQuery.isLoading ||
			incidentsByRegionQuery.isLoading ||
			resourceUtilizationQuery.isLoading,
		isError:
			responseTimesQuery.isError ||
			incidentsByRegionQuery.isError ||
			resourceUtilizationQuery.isError,
		error:
			responseTimesQuery.error ||
			incidentsByRegionQuery.error ||
			resourceUtilizationQuery.error,
	};
}

export type { TimeWindow };
