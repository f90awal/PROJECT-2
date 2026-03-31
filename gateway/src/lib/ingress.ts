function envUrl(name: string, fallback: string) {
	const raw = process.env[name]?.trim();
	return raw && raw.length > 0 ? raw : fallback;
}

export const SERVICE_ROUTES = [
	{
		prefix: "/api/incident",
		baseUrl: envUrl("INCIDENTS_SERVICE_URL", "http://localhost:4001"),
		stripPrefix: false,
	},
	{
		prefix: "/api/dispatch",
		baseUrl: envUrl("DISPATCH_SERVICE_URL", "http://localhost:4002"),
		stripPrefix: false,
	},
	{
		prefix: "/api/analytics",
		baseUrl: envUrl("ANALYTICS_SERVICE_URL", "http://localhost:4003"),
		stripPrefix: false,
	},
];
