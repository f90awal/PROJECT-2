import { useLoadScript } from "@react-google-maps/api";
import React from "react";
import { useForm } from "react-hook-form";
import { Modal } from "~/components/modal";
import { reverseGeocode } from "~/lib/google";
import type {
	CreateStationPayload,
	DispatchStationType,
} from "~/lib/types/dispatch/model";
import { useDispatchResources } from "~/lib/use-dispatch";

const inputClass =
	"w-full border-b border-stone-300 dark:border-stone-600 bg-transparent px-0 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 outline-none focus:border-stone-600 dark:focus:border-stone-400 transition-colors font-mono";

const labelClass =
	"block text-[10px] font-mono font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1";

type StationFormData = Omit<CreateStationPayload, "location"> & {
	address: string;
	lat: number;
	lng: number;
};

function stationTypeLabel(type: DispatchStationType) {
	if (type === "ambulance") return "Ambulance";
	if (type === "fire") return "Fire";
	return "Police";
}

export function AddResourceModal({
	open,
	onClose,
	initialLatLng,
	onCreated,
}: {
	open: boolean;
	onClose: () => void;
	initialLatLng?: { lat: number; lng: number };
	onCreated?: (coords: { lat: number; lng: number }) => void;
}) {
	const { create } = useDispatchResources(false);
	const { isLoaded: isGoogleLoaded } = useLoadScript({
		googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
		libraries: ["places"],
	});
	const [isResolvingAddress, setIsResolvingAddress] = React.useState(false);
	const { register, handleSubmit, reset, setValue } = useForm<StationFormData>({
		defaultValues: {
			name: "",
			type: "ambulance",
			address: "",
			respondersCount: 4,
			lat: initialLatLng?.lat ?? 0,
			lng: initialLatLng?.lng ?? 0,
		},
	});

	React.useEffect(() => {
		if (!open || !initialLatLng) return;
		setValue("lat", Number(initialLatLng.lat.toFixed(6)));
		setValue("lng", Number(initialLatLng.lng.toFixed(6)));

		if (!isGoogleLoaded) {
			setValue(
				"address",
				`Pinned at ${initialLatLng.lat.toFixed(5)}, ${initialLatLng.lng.toFixed(5)}`,
			);
			return;
		}

		let isMounted = true;
		setIsResolvingAddress(true);

		(async () => {
			try {
				const address = await reverseGeocode(
					initialLatLng.lng,
					initialLatLng.lat,
				);
				if (!isMounted) return;
				setValue("address", address || "");
			} catch {
				if (!isMounted) return;
				setValue(
					"address",
					`Pinned at ${initialLatLng.lat.toFixed(5)}, ${initialLatLng.lng.toFixed(5)}`,
				);
			} finally {
				if (isMounted) {
					setIsResolvingAddress(false);
				}
			}
		})();

		return () => {
			isMounted = false;
		};
	}, [initialLatLng, isGoogleLoaded, open, setValue]);

	function closeAndReset() {
		reset();
		onClose();
	}

	function onSubmit(data: StationFormData) {
		const payload: CreateStationPayload = {
			name: data.name,
			type: data.type,
			respondersCount: data.respondersCount,
			location: {
				address: data.address,
				lat: data.lat,
				lng: data.lng,
			},
		};

		create.mutate(payload, {
			onSuccess: () => {
				onCreated?.({ lat: data.lat, lng: data.lng });
				closeAndReset();
			},
		});
	}

	return (
		<Modal open={open} onClose={closeAndReset} className="w-full max-w-lg">
			{/* Header */}
			<div className="flex items-center justify-between px-5 py-3 border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950">
				<div className="flex items-center gap-2.5">
					<div className="i-solar-box-linear size-4 text-stone-500 dark:text-stone-400" />
					<span className="text-xs font-mono font-semibold uppercase tracking-widest text-stone-600 dark:text-stone-400">
						Create Station
					</span>
				</div>
				<button
					type="button"
					onClick={closeAndReset}
					className="flex items-center justify-center size-6 rounded bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-400 dark:text-stone-500 transition-colors"
				>
					<div className="i-lucide-x size-3.5" />
				</button>
			</div>

			<form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-stone-900 p-5 space-y-5">
				<div className="grid grid-cols-2 gap-5">
					<div>
						<label className={labelClass}>Station Name</label>
						<input
							{...register("name", { required: true })}
							type="text"
							placeholder="Airport Fire Station"
							className={inputClass}
						/>
					</div>
					<div>
						<label className={labelClass}>Type</label>
						<select
							{...register("type", { required: true })}
							className={inputClass}
						>
							{(["ambulance", "fire", "police"] as const).map((type) => (
								<option key={type} value={type}>
									{stationTypeLabel(type)}
								</option>
							))}
						</select>
					</div>
				</div>

				<div>
					<label className={labelClass}>Address</label>
					<input
						{...register("address", { required: true })}
						type="text"
						placeholder="Ring Road Central, Accra"
						className={inputClass}
					/>
					{isResolvingAddress && (
						<p className="mt-1 text-[10px] font-mono text-stone-400">resolving...</p>
					)}
				</div>

				<div className="grid grid-cols-3 gap-5">
					<div>
						<label className={labelClass}>Responders</label>
						<select
							{...register("respondersCount", {
								required: true,
								setValueAs: (value: string) => Number(value),
							})}
							className={inputClass}
						>
							<option value={3}>3</option>
							<option value={4}>4</option>
						</select>
					</div>
					<div>
						<label className={labelClass}>Latitude</label>
						<input
							{...register("lat", { required: true, valueAsNumber: true })}
							type="number"
							step="any"
							className={`${inputClass} opacity-60 cursor-not-allowed`}
							disabled
						/>
					</div>
					<div>
						<label className={labelClass}>Longitude</label>
						<input
							{...register("lng", { required: true, valueAsNumber: true })}
							type="number"
							step="any"
							className={`${inputClass} opacity-60 cursor-not-allowed`}
							disabled
						/>
					</div>
				</div>

				<div className="flex justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
					<button
						type="button"
						onClick={closeAndReset}
						className="px-4 py-2 rounded text-xs font-mono uppercase tracking-wider text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={create.isPending}
						className="px-4 py-2 rounded text-xs font-mono uppercase tracking-wider bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-white disabled:opacity-60 font-semibold transition-colors"
					>
						{create.isPending ? "Provisioning..." : "Create Station"}
					</button>
				</div>
			</form>
		</Modal>
	);
}
