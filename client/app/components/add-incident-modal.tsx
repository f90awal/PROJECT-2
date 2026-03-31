import { useLoadScript } from "@react-google-maps/api";
import React from "react";
import { useForm } from "react-hook-form";
import { Modal } from "~/components/modal";
import { reverseGeocode } from "~/lib/google";
import type { CreateIncidentPayload, Incident } from "~/lib/types";
import { useIncidents } from "~/lib/use-incidents";

const INCIDENT_TYPES: Array<{
	code: CreateIncidentPayload["type"]["code"];
	category: NonNullable<CreateIncidentPayload["type"]["category"]>;
}> = [
	{ code: "FIRE", category: "Natural" },
	{ code: "FLOOD", category: "Natural" },
	{ code: "ACCIDENT", category: "Traffic" },
	{ code: "MEDICAL", category: "Health" },
	{ code: "SECURITY", category: "Crime" },
	{ code: "OTHER", category: "Other" },
];

type IncidentFormData = CreateIncidentPayload & {
	lat: number;
	lng: number;
};

const inputClass =
	"w-full border-b border-stone-300 dark:border-stone-600 bg-transparent px-0 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 outline-none focus:border-stone-600 dark:focus:border-stone-400 transition-colors font-mono";

const labelClass =
	"block text-[10px] font-mono font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1";

export function AddIncidentModal({
	open,
	onClose,
	initialLatLng,
	onCreated,
}: {
	open: boolean;
	onClose: () => void;
	initialLatLng?: { lat: number; lng: number };
	onCreated?: (incident: Incident) => void;
}) {
	const { create } = useIncidents();
	const { isLoaded: isGoogleLoaded } = useLoadScript({
		googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
		libraries: ["places"],
	});
	const [isResolvingAddress, setIsResolvingAddress] = React.useState(false);
	const { register, handleSubmit, reset, setValue } = useForm<IncidentFormData>(
		{
			defaultValues: {
				type: { code: "", category: "" },
				description: "",
				location: { address: "", radius: 0, center: [0, 0] },
				priority: { level: "medium" },
				metadata: { callerName: "", callerContact: "", notes: "" },
				lat: 0,
				lng: 0,
			},
		},
	);

	React.useEffect(() => {
		if (!open || !initialLatLng) return;

		const lat = Number(initialLatLng.lat.toFixed(6));
		const lng = Number(initialLatLng.lng.toFixed(6));
		setValue("lat", lat);
		setValue("lng", lng);

		if (!isGoogleLoaded) return;

		let isMounted = true;
		setIsResolvingAddress(true);

		(async () => {
			try {
				const address = await reverseGeocode(lng, lat);
				if (!isMounted) return;
				setValue("location.address", address || "");
			} catch {
				if (!isMounted) return;
				setValue("location.address", "");
			} finally {
				if (isMounted) {
					setIsResolvingAddress(false);
				}
			}
		})();

		return () => {
			isMounted = false;
		};
	}, [open, initialLatLng, isGoogleLoaded, setValue]);

	function onSubmit(data: IncidentFormData) {
		const inferredCategory =
			INCIDENT_TYPES.find((type) => type.code === data.type.code)?.category ||
			undefined;

		const payload: CreateIncidentPayload = {
			type: {
				code: data.type.code,
				category: data.type.category || inferredCategory,
			},
			description: data.description || undefined,
			location: {
				address: data.location.address,
				center: [data.lng, data.lat] as [number, number],
				radius: data.location.radius,
			},
			priority: {
				level: data.priority.level,
			},
			metadata: {
				callerName: data.metadata?.callerName ?? "",
				callerContact: data.metadata?.callerContact ?? "",
				notes: data.description || undefined,
			},
		};

		create.mutate(payload, {
			onSuccess: (incident) => {
				onCreated?.(incident);
				handleClose();
			},
		});
	}

	function handleClose() {
		reset();
		onClose();
	}

	return (
		<Modal open={open} onClose={handleClose} className="w-full max-w-2xl">
			{/* Modal header bar */}
			<div className="flex items-center justify-between px-5 py-3 border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950">
				<div className="flex items-center gap-2.5">
					<div className="i-solar-danger-triangle-linear size-4 text-orange-500" />
					<span className="text-xs font-mono font-semibold uppercase tracking-widest text-stone-600 dark:text-stone-400">
						New Incident
					</span>
				</div>
				<button
					type="button"
					onClick={handleClose}
					className="flex items-center justify-center size-6 rounded bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-400 dark:text-stone-500 transition-colors"
				>
					<div className="i-lucide-x size-3.5" />
				</button>
			</div>

			<form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-stone-900 p-5">
				<div className="grid grid-cols-2 gap-x-8 gap-y-5">
					{/* Left column */}
					<div className="space-y-5">
						<div>
							<p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-3 border-b border-stone-100 dark:border-stone-800 pb-1">
								Caller
							</p>
							<div className="space-y-4">
								<div>
									<label className={labelClass}>Name</label>
									<input
										{...register("metadata.callerName", { required: true })}
										type="text"
										placeholder="Full name"
										className={inputClass}
									/>
								</div>
								<div>
									<label className={labelClass}>Phone</label>
									<input
										{...register("metadata.callerContact", { required: true })}
										type="tel"
										placeholder="+233 020 000 0000"
										className={inputClass}
									/>
								</div>
							</div>
						</div>

						<div>
							<p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-3 border-b border-stone-100 dark:border-stone-800 pb-1">
								Type
							</p>
							<div className="space-y-4">
								<div>
									<label className={labelClass}>Incident</label>
									<select
										{...register("type.code", { required: true })}
										className={inputClass}
									>
										<option value="">Select type</option>
										{INCIDENT_TYPES.map((t) => (
											<option key={t.code} value={t.code}>
												{t.code}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className={labelClass}>Category</label>
									<input
										{...register("type.category")}
										type="text"
										placeholder="e.g. Natural"
										className={inputClass}
									/>
								</div>
							</div>
						</div>

						<div>
							<p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-3 border-b border-stone-100 dark:border-stone-800 pb-1">
								Priority
							</p>
							<div className="flex gap-2">
								{(["low", "medium", "high"] as const).map((level) => (
									<label key={level} className="flex-1 cursor-pointer">
										<input
											{...register("priority.level")}
											type="radio"
											value={level}
											className="sr-only peer"
										/>
										<div
											className={`text-center border py-1.5 text-xs font-mono font-semibold uppercase tracking-wider transition-colors cursor-pointer rounded
											${level === "low" && "border-stone-300 dark:border-stone-600 text-stone-400 peer-checked:bg-emerald-600 peer-checked:border-emerald-600 peer-checked:text-white"}
											${level === "medium" && "border-stone-300 dark:border-stone-600 text-stone-400 peer-checked:bg-amber-500 peer-checked:border-amber-500 peer-checked:text-white"}
											${level === "high" && "border-stone-300 dark:border-stone-600 text-stone-400 peer-checked:bg-red-600 peer-checked:border-red-600 peer-checked:text-white"}
										`}
										>
											{level}
										</div>
									</label>
								))}
							</div>
						</div>
					</div>

					{/* Right column */}
					<div className="space-y-5">
						<div>
							<p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-3 border-b border-stone-100 dark:border-stone-800 pb-1">
								Location
							</p>
							<div className="space-y-4">
								<div>
									<label className={labelClass}>Address</label>
									<input
										{...register("location.address", { required: true })}
										type="text"
										placeholder="Street address or landmark"
										readOnly
										className={`${inputClass} opacity-60 cursor-not-allowed`}
									/>
									{isResolvingAddress && (
										<p className="mt-1 text-[10px] font-mono text-stone-400">
											resolving...
										</p>
									)}
								</div>
								<div className="grid grid-cols-3 gap-3">
									<div>
										<label className={labelClass}>Lat</label>
										<input
											{...register("lat", { required: true, valueAsNumber: true })}
											type="number"
											step="any"
											className={`${inputClass} opacity-60 cursor-not-allowed`}
											disabled
										/>
									</div>
									<div>
										<label className={labelClass}>Lng</label>
										<input
											{...register("lng", { required: true, valueAsNumber: true })}
											type="number"
											step="any"
											className={`${inputClass} opacity-60 cursor-not-allowed`}
											disabled
										/>
									</div>
									<div>
										<label className={labelClass}>Radius m</label>
										<input
											{...register("location.radius", { valueAsNumber: true })}
											type="number"
											min="0"
											placeholder="0"
											className={inputClass}
										/>
									</div>
								</div>
							</div>
						</div>

						<div className="flex-1">
							<p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-3 border-b border-stone-100 dark:border-stone-800 pb-1">
								Notes
							</p>
							<textarea
								{...register("description")}
								placeholder="Additional details about the incident..."
								rows={6}
								className={`${inputClass} border border-stone-200 dark:border-stone-700 rounded px-3 py-2 resize-none`}
							/>
						</div>
					</div>
				</div>

				<div className="flex justify-end gap-2 mt-5 pt-4 border-t border-stone-100 dark:border-stone-800">
					<button
						type="button"
						onClick={handleClose}
						className="px-4 py-2 rounded text-xs font-mono uppercase tracking-wider text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={create.isPending}
						className="px-4 py-2 rounded text-xs font-mono uppercase tracking-wider bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-white disabled:opacity-60 font-semibold transition-colors"
					>
						{create.isPending ? "Submitting..." : "Submit Report"}
					</button>
				</div>
			</form>
		</Modal>
	);
}
