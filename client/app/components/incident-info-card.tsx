import { statusClass } from "~/lib/config";
import type { Incident } from "~/lib/types";

type IncidentInfoCardProps = {
	incident: Incident;
	title: string;
	lat: number;
	lng: number;
	typeIcon: { icon: string; color: string };
	onClose: () => void;
};

const statusFallbackClass =
	"bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-neutral-800 dark:text-zinc-300 dark:border-neutral-700";

function formatDate(value?: string | null) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleString();
}

export function IncidentInfoCard({
	incident,
	title,
	lat,
	lng,
	typeIcon,
	onClose,
}: IncidentInfoCardProps) {
	return (
		<div className="w-86 rounded-xl bg-white font-mono dark:bg-neutral-900 shadow-lg p-3 border border-zinc-200 dark:border-neutral-800">
			<div className="mb-2 flex items-center justify-between">
				<h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
					Incident #{incident.id}
				</h3>
				<button
					type="button"
					onClick={onClose}
					className="text-sm md:text-lg rounded-full bg-zinc-100 dark:bg-neutral-800 hover:bg-zinc-200 dark:hover:bg-neutral-700 p-1 text-zinc-500"
				>
					<div className="i-lucide-x" />
				</button>
			</div>

			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<span
						className={`inline-flex size-7 items-center justify-center rounded-full ${typeIcon.color}`}
					>
						<span className={`${typeIcon.icon} size-4`} />
					</span>
					<div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
						{title}
					</div>
				</div>

				<div
					className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass[incident.status] ?? statusFallbackClass}`}
				>
					{incident.status.replace("_", " ")}
				</div>

				<div className="grid grid-cols-[84px_1fr] gap-x-2 gap-y-1 text-[11px] text-zinc-600 dark:text-zinc-300">
					<span className="text-zinc-500 dark:text-zinc-400">Name</span>
					<span className="truncate">{title}</span>

					<span className="text-zinc-500 dark:text-zinc-400">Type</span>
					<span className="truncate">
						{incident.type.code}
						{incident.type.category ? ` (${incident.type.category})` : ""}
					</span>

					<span className="text-zinc-500 dark:text-zinc-400">Address</span>
					<span className="line-clamp-2">
						{incident.location.address || "-"}
					</span>

					<span className="text-zinc-500 dark:text-zinc-400">Coord</span>
					<span>
						{" "}
						{lat.toFixed(5)}, {lng.toFixed(5)}
					</span>

					<span className="text-zinc-500 dark:text-zinc-400">Radius</span>
					<span>{incident.location.radius} m</span>

					<span className="text-zinc-500 dark:text-zinc-400">Priority</span>
					<span>
						{incident.priority.level}
						{typeof incident.priority.score === "number"
							? ` (score ${incident.priority.score})`
							: ""}
					</span>

					<span className="text-zinc-500 dark:text-zinc-400">Caller</span>
					<span>{incident.metadata?.callerName || "-"}</span>

					<span className="text-zinc-500 dark:text-zinc-400">Contact</span>
					<span>{incident.metadata?.callerContact || "-"}</span>

					<span className="text-zinc-500 dark:text-zinc-400">Notes</span>
					<span className="line-clamp-2">
						{incident.metadata?.notes || "-"}
					</span>

					<span className="text-zinc-500 dark:text-zinc-400">Version</span>
					<span>{incident.version}</span>

					<span className="text-zinc-500 dark:text-zinc-400">Created</span>
					<span>{formatDate(incident.createdAt)}</span>

					<span className="text-zinc-500 dark:text-zinc-400">Dispatched</span>
					<span>{formatDate(incident.dispatchedAt)}</span>

					<span className="text-zinc-500 dark:text-zinc-400">Resolved</span>
					<span>{formatDate(incident.resolvedAt)}</span>
				</div>
			</div>
		</div>
	);
}
