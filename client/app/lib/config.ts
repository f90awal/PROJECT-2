export const affiliationConfig = {
	hospital: {
		label: "Hospital Admin",
		icon: "i-solar-medical-kit-bold",
		color:
			"bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/70 dark:text-red-300 dark:border-red-700/50",
	},
	fire: {
		label: "Fire Service",
		icon: "i-solar-fire-bold",
		color:
			"bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/70 dark:text-orange-300 dark:border-orange-700/50",
	},
	police: {
		label: "Police",
		icon: "i-solar-shield-bold",
		color:
			"bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/70 dark:text-blue-300 dark:border-blue-700/50",
	},
	system: {
		label: "System Admin",
		icon: "i-solar-settings-bold",
		color:
			"bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-neutral-800 dark:text-zinc-300 dark:border-neutral-700",
	},
};

export type AffiliationKey = keyof typeof affiliationConfig;

export function resolveIncidentAffiliation(input: {
	category?: string;
	code?: string;
}): AffiliationKey {
	const key = `${input.category ?? ""} ${input.code ?? ""}`
		.toLowerCase()
		.trim();

	if (key.includes("fire")) return "fire";
	if (key.includes("police")) return "police";
	if (
		key.includes("hospital") ||
		key.includes("medical") ||
		key.includes("ems")
	) {
		return "hospital";
	}

	return "system";
}

export const statusClass: Record<string, string> = {
	created:
		"bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/70 dark:text-amber-300 dark:border-amber-700/50",
	dispatched:
		"bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/70 dark:text-blue-300 dark:border-blue-700/50",
	in_progress:
		"bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/70 dark:text-violet-300 dark:border-violet-700/50",
	resolved:
		"bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/70 dark:text-emerald-300 dark:border-emerald-700/50",
	cancelled:
		"bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-neutral-800 dark:text-zinc-300 dark:border-neutral-700",
};

export const incidentTypeIconConfig = {
	FIRE: {
		icon: "i-solar-fire-bold",
		color:
			"bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/70 dark:text-orange-300 dark:border-orange-700/50",
	},
	FLOOD: {
		icon: "i-solar-waterdrop-bold",
		color:
			"bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-900/70 dark:text-cyan-300 dark:border-cyan-700/50",
	},
	ACCIDENT: {
		icon: "i-solar-danger-triangle-bold",
		color:
			"bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/70 dark:text-amber-300 dark:border-amber-700/50",
	},
	MEDICAL: {
		icon: "i-solar-medical-kit-bold",
		color:
			"bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/70 dark:text-red-300 dark:border-red-700/50",
	},
	SECURITY: {
		icon: "i-solar-shield-bold",
		color:
			"bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/70 dark:text-blue-300 dark:border-blue-700/50",
	},
	OTHER: {
		icon: "i-solar-widget-6-bold",
		color:
			"bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-neutral-800 dark:text-zinc-300 dark:border-neutral-700",
	},
} as const;

type IncidentTypeIconKey = keyof typeof incidentTypeIconConfig;

export function resolveIncidentTypeIcon(code?: string) {
	if (!code) return incidentTypeIconConfig.OTHER;

	const normalized = code.trim().toUpperCase() as IncidentTypeIconKey;
	return incidentTypeIconConfig[normalized] ?? incidentTypeIconConfig.OTHER;
}
