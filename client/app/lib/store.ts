import { atom } from "jotai";

export type AppTheme = "light" | "dark" | "system";
export const colorScheme = atom<AppTheme>("system");
export const colorSchemePreference = atom<AppTheme>("system");

export type NavPanel =
	| "incidents"
	| "resources"
	| "analytics"
	| "dashboard"
	| null;
export const activePanelAtom = atom<NavPanel>(null);

export type IncidentFocusRequest = {
	incidentId: number;
	requestId: number;
};

export const incidentFocusRequestAtom = atom<IncidentFocusRequest | null>(null);

export type ResourceFocusRequest = {
	vehicleId: number;
	requestId: number;
};

export const resourceFocusRequestAtom = atom<ResourceFocusRequest | null>(null);
