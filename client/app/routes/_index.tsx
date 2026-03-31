import { tryit } from "radashi";
import React from "react";
import {
	type LoaderFunctionArgs,
	type MetaFunction,
	redirect,
} from "react-router";
import { AddIncidentModal } from "~/components/add-incident-modal";
import { AddResourceModal } from "~/components/add-resource-modal";
import { AffiliationBadge } from "~/components/affiliation";
import GeospyMap from "~/components/map";
import { Navbar } from "~/components/navbar";
import Navigation from "~/components/navigation";
import { OperationsPanel } from "~/components/operations-panel";
import { checkAuth } from "~/lib/check-auth";
import { useAtom } from "jotai";
import { activePanelAtom } from "~/lib/store";

export const meta: MetaFunction = () => {
	return [
		{ title: "Dispatch" },
		{ name: "description", content: "Emergency dispatch platform" },
	];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const [err] = await tryit(checkAuth)(request);

	if (err) {
		throw redirect("/login");
	}
};

export default function Index() {
	const [activePanel, setActivePanel] = useAtom(activePanelAtom);
	const isFullScreen = activePanel === "dashboard" || activePanel === "analytics";

	const [mapFocus, setMapFocus] = React.useState({
		lat: 5.614818,
		lng: -0.205874,
	});
	const [incidentModalOpen, setIncidentModalOpen] = React.useState(false);
	const [resourceModalOpen, setResourceModalOpen] = React.useState(false);
	const [incidentCoords, setIncidentCoords] = React.useState<
		{ lat: number; lng: number } | undefined
	>(undefined);

	function handleRequestIncidentAt(coords: { lat: number; lng: number }) {
		setIncidentCoords(coords);
		setIncidentModalOpen(true);
	}

	function handleIncidentCreated(incident: {
		location?: { center?: number[] | null } | null;
	}) {
		const center = incident.location?.center;
		if (!Array.isArray(center) || center.length < 2) return;

		const lng = Number(center[0]);
		const lat = Number(center[1]);
		if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

		setMapFocus({ lat, lng });
	}

	function handleRequestResourceAt(coords: { lat: number; lng: number }) {
		setIncidentCoords(coords);
		setResourceModalOpen(true);
	}

	function handleResourceCreated(coords: { lat: number; lng: number }) {
		setMapFocus(coords);
	}

	return (
		<div className="h-screen flex flex-col bg-stone-100 dark:bg-stone-950">
			{/* Top header */}
			<header className="h-11 shrink-0 flex items-center justify-between bg-stone-900 dark:bg-stone-950 border-b border-stone-700 dark:border-stone-800 px-4 z-200">
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2">
						<div className="i-solar-danger-triangle-bold size-4 text-orange-400" />
						<span className="text-xs font-semibold tracking-widest uppercase text-stone-300 font-mono">
							Dispatch
						</span>
					</div>
					<div className="w-px h-4 bg-stone-700" />
					<AffiliationBadge />
				</div>
				<Navbar />
			</header>

			{/* Body */}
			<div className="flex flex-1 overflow-hidden">
				{/* Left sidebar navigation */}
				<Navigation />

				{/* Map */}
				<main className="flex-1 relative">
					<GeospyMap
						initialLatLng={mapFocus}
						onRequestIncidentAt={handleRequestIncidentAt}
						onRequestResourceAt={handleRequestResourceAt}
					/>
				</main>
			</div>

			<AddIncidentModal
				open={incidentModalOpen}
				onClose={() => setIncidentModalOpen(false)}
				initialLatLng={incidentCoords}
				onCreated={handleIncidentCreated}
			/>

			<AddResourceModal
				open={resourceModalOpen}
				onClose={() => setResourceModalOpen(false)}
				initialLatLng={incidentCoords}
				onCreated={handleResourceCreated}
			/>

			{isFullScreen && (
				<OperationsPanel
					initialTab={activePanel as "dashboard" | "analytics"}
					onClose={() => setActivePanel(null)}
				/>
			)}
		</div>
	);
}
