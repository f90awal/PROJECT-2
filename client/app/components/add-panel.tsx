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
	return (
		<div
			className="absolute z-150 w-72 rounded-xl bg-white font-mono dark:bg-neutral-900 shadow-lg p-3 border border-zinc-200 dark:border-neutral-800"
			style={{ left: position.x + 10, top: position.y + 10 }}
		>
			<h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
				Add Here
			</h3>
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
			<div className="mt-2 flex justify-end">
				<button
					type="button"
					onClick={onClose}
					className="rounded-md px-2 py-1 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-neutral-800"
				>
					Close
				</button>
			</div>
		</div>
	);
}
