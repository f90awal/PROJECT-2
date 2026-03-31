type AddMenuProps = {
	position: { x: number; y: number };
	onAddIncident: () => void;
	onAddResource: () => void;
	onClose: () => void;
};

export function AddMenu({
	position,
	onAddIncident,
	onAddResource,
	onClose,
}: AddMenuProps) {
	const menuWidth = 344; // w-86
	const menuHeightEstimate = 230;
	const gap = 10;
	const edgePadding = 8;

	const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
	const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0;

	const preferredLeft = position.x + gap;
	const preferredTop = position.y + gap;
	const fallbackTop = position.y - menuHeightEstimate - gap;

	const maxLeft = Math.max(
		edgePadding,
		viewportWidth - menuWidth - edgePadding,
	);
	const left = Math.min(Math.max(preferredLeft, edgePadding), maxLeft);

	const shouldFlipUp =
		viewportHeight > 0 &&
		preferredTop + menuHeightEstimate > viewportHeight - edgePadding;
	const unclampedTop = shouldFlipUp ? fallbackTop : preferredTop;
	const maxTop = Math.max(
		edgePadding,
		viewportHeight - menuHeightEstimate - edgePadding,
	);
	const top = Math.min(Math.max(unclampedTop, edgePadding), maxTop);

	return (
		<div
			className="absolute z-150 w-86 rounded-xl bg-white font-mono dark:bg-neutral-900 shadow-lg p-3 border border-zinc-200 dark:border-neutral-800"
			style={{ left, top }}
		>
			<div className="mb-2 flex items-center justify-between">
				<h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
					Add Here
				</h3>
				<button
					type="button"
					onClick={onClose}
					className="text-sm md:text-lg rounded-full bg-zinc-100 dark:bg-neutral-800 hover:bg-zinc-200 dark:hover:bg-neutral-700 p-1 text-zinc-500"
				>
					<div className="i-lucide-x" />
				</button>
			</div>
			<div className="flex flex-col gap-2">
				<button
					type="button"
					onClick={onAddIncident}
					className="w-full text-left rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50 dark:hover:bg-neutral-800 dark:(bg-neutral-800 border-neutral-700) transition"
				>
					<div className="flex items-center gap-2">
						<div className="i-solar-danger-triangle-linear size-5 text-zinc-700 dark:text-zinc-200" />
						<div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
							Incident
						</div>
					</div>
					<p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
						Register a new incident at this location
					</p>
				</button>

				<button
					type="button"
					onClick={onAddResource}
					className="w-full text-left rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50 dark:hover:bg-neutral-800 dark:(bg-neutral-800 border-neutral-700) transition"
				>
					<div className="flex items-center gap-2">
						<div className="i-solar-box-linear size-5 text-zinc-700 dark:text-zinc-200" />
						<div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
							Resource
						</div>
					</div>
					<p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
						Register a new resource at this location
					</p>
				</button>
			</div>
		</div>
	);
}
