import { useRouteLoaderData } from "react-router";
import { affiliationConfig } from "~/lib/config";
import { cn } from "~/lib/utils";
import type { loader as rootLoader } from "~/root";

export function AffiliationBadge() {
	const { user } = useRouteLoaderData<typeof rootLoader>("root") || {};

	if (!user?.affiliation) return null;

	const config = affiliationConfig[user.affiliation];

	return (
		<div
			className={cn(
				"flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
				config.color,
			)}
		>
			<div className={cn("size-5", config.icon)} />
			{config.label}
		</div>
	);
}
