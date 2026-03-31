export const openApiDoc = {
	openapi: "3.0.0",
	info: {
		title: "Analytics API",
		version: "1.0.0",
		description:
			"Operational analytics for response times, incidents and resource usage.",
	},
	servers: [{ url: "/api/analytics" }],
	components: {
		securitySchemes: {
			BearerAuth: {
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
			},
		},
		parameters: {
			FromQuery: {
				name: "from",
				in: "query",
				required: false,
				schema: { type: "string", format: "date-time" },
				description: "Inclusive start of range in ISO date-time format.",
			},
			ToQuery: {
				name: "to",
				in: "query",
				required: false,
				schema: { type: "string", format: "date-time" },
				description: "Inclusive end of range in ISO date-time format.",
			},
			TopQuery: {
				name: "top",
				in: "query",
				required: false,
				schema: { type: "integer", minimum: 1, maximum: 100, default: 5 },
				description: "How many responders per emergency service to return.",
			},
		},
		schemas: {
			Range: {
				type: "object",
				properties: {
					from: { type: "string", format: "date-time" },
					to: { type: "string", format: "date-time" },
				},
				required: ["from", "to"],
			},
			ResponseTimesOverall: {
				type: "object",
				properties: {
					avgMinutes: { type: "number", nullable: true },
					totalDispatches: { type: "integer" },
					totalArrived: { type: "integer" },
				},
				required: ["avgMinutes", "totalDispatches", "totalArrived"],
			},
			ResponseTimesByServiceItem: {
				type: "object",
				properties: {
					emergencyService: {
						type: "string",
						enum: ["ambulance", "fire", "police"],
					},
					avgMinutes: { type: "number", nullable: true },
					p50Minutes: { type: "number", nullable: true },
					p95Minutes: { type: "number", nullable: true },
					totalDispatches: { type: "integer" },
					totalArrived: { type: "integer" },
					arrivalRate: { type: "number", nullable: true },
				},
				required: [
					"emergencyService",
					"avgMinutes",
					"p50Minutes",
					"p95Minutes",
					"totalDispatches",
					"totalArrived",
					"arrivalRate",
				],
			},
			ResponseTimesResponse: {
				type: "object",
				properties: {
					range: { $ref: "#/components/schemas/Range" },
					overall: { $ref: "#/components/schemas/ResponseTimesOverall" },
					byService: {
						type: "array",
						items: { $ref: "#/components/schemas/ResponseTimesByServiceItem" },
					},
				},
				required: ["range", "overall", "byService"],
			},
			IncidentsByRegionItem: {
				type: "object",
				properties: {
					region: { type: "string" },
					incidentType: { type: "string" },
					count: { type: "integer" },
				},
				required: ["region", "incidentType", "count"],
			},
			IncidentsByRegionResponse: {
				type: "object",
				properties: {
					range: { $ref: "#/components/schemas/Range" },
					totalIncidents: { type: "integer" },
					breakdown: {
						type: "array",
						items: { $ref: "#/components/schemas/IncidentsByRegionItem" },
					},
				},
				required: ["range", "totalIncidents", "breakdown"],
			},
			BedUsage: {
				type: "object",
				properties: {
					totalBeds: { type: "integer" },
					availableBeds: { type: "integer" },
					usedBeds: { type: "integer" },
					usageRatePercent: { type: "number", nullable: true },
				},
				required: [
					"totalBeds",
					"availableBeds",
					"usedBeds",
					"usageRatePercent",
				],
			},
			TopResponder: {
				type: "object",
				properties: {
					responderId: { type: "string" },
					responderName: { type: "string", nullable: true },
					deployments: { type: "integer" },
				},
				required: ["responderId", "responderName", "deployments"],
			},
			ResourceUtilizationResponse: {
				type: "object",
				properties: {
					range: { $ref: "#/components/schemas/Range" },
					hospitalsConsidered: { type: "integer" },
					bedUsage: { $ref: "#/components/schemas/BedUsage" },
					topRespondersByService: {
						type: "object",
						additionalProperties: {
							type: "array",
							items: { $ref: "#/components/schemas/TopResponder" },
						},
					},
				},
				required: [
					"range",
					"hospitalsConsidered",
					"bedUsage",
					"topRespondersByService",
				],
			},
			ErrorResponse: {
				type: "object",
				properties: {
					detail: { type: "string" },
				},
				required: ["detail"],
			},
		},
	},
	security: [{ BearerAuth: [] }],
	paths: {
		"/response-times": {
			get: {
				tags: ["Analytics"],
				summary: "Average response times",
				description: "Returns average response times per emergency service.",
				parameters: [
					{ $ref: "#/components/parameters/FromQuery" },
					{ $ref: "#/components/parameters/ToQuery" },
				],
				responses: {
					"200": {
						description: "Response-time analytics",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ResponseTimesResponse" },
							},
						},
					},
					"400": {
						description: "Invalid query parameters",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ErrorResponse" },
							},
						},
					},
				},
			},
		},
		"/incidents-by-region": {
			get: {
				tags: ["Analytics"],
				summary: "Incidents by region and type",
				parameters: [
					{ $ref: "#/components/parameters/FromQuery" },
					{ $ref: "#/components/parameters/ToQuery" },
				],
				responses: {
					"200": {
						description:
							"Incident aggregation grouped by region and incident type",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/IncidentsByRegionResponse",
								},
							},
						},
					},
					"400": {
						description: "Invalid query parameters",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ErrorResponse" },
							},
						},
					},
				},
			},
		},
		"/resource-utilization": {
			get: {
				tags: ["Analytics"],
				summary: "Resource utilization analytics",
				description:
					"Returns hospital bed usage and top deployed responders grouped by emergency service.",
				parameters: [
					{ $ref: "#/components/parameters/FromQuery" },
					{ $ref: "#/components/parameters/ToQuery" },
					{ $ref: "#/components/parameters/TopQuery" },
				],
				responses: {
					"200": {
						description: "Resource utilization metrics",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/ResourceUtilizationResponse",
								},
							},
						},
					},
					"400": {
						description: "Invalid query parameters",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ErrorResponse" },
							},
						},
					},
				},
			},
		},
	},
};
