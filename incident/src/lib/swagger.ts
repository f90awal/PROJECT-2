const openApiDoc = {
	openapi: "3.0.0",
	info: {
		title: "Incident API",
		version: "1.0.0",
		description: "Incident management and responder endpoints",
	},
	servers: [{ url: "/api/incident" }],
	components: {
		securitySchemes: {
			bearerAuth: {
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
			},
		},
		schemas: {
			Status: {
				type: "string",
				enum: ["created", "dispatched", "in_progress", "resolved", "cancelled"],
			},
			ResponderType: {
				type: "string",
				enum: ["police", "fire", "hospital"],
			},

			ResponderStatus: {
				type: "string",
				enum: ["available", "dispatched", "off_duty"],
			},
			PriorityLevel: {
				type: "string",
				enum: ["low", "medium", "high"],
			},
			IncidentLocation: {
				type: "object",
				properties: {
					address: { type: "string" },
					center: {
						type: "array",
						items: { type: "number" },
						minItems: 2,
						maxItems: 2,
						description: "[lat, lng]",
					},
					radius: { type: "number", minimum: 0 },
				},
				required: ["address", "center", "radius"],
			},
			IncidentType: {
				type: "object",
				properties: {
					code: { type: "string" },
					category: { type: "string" },
				},
				required: ["code"],
			},
			IncidentPriority: {
				type: "object",
				properties: {
					level: { $ref: "#/components/schemas/PriorityLevel" },
					score: { type: "number" },
					escalationMins: { type: "number" },
				},
				required: ["level"],
			},
			IncidentMetadata: {
				type: "object",
				properties: {
					callerName: { type: "string" },
					callerContact: { type: "string" },
					notes: { type: "string" },
				},
				required: ["callerName", "callerContact"],
				additionalProperties: false,
			},
			Incident: {
				type: "object",
				properties: {
					id: { type: "integer" },
					type: { $ref: "#/components/schemas/IncidentType" },
					description: { type: "string", nullable: true },
					location: { $ref: "#/components/schemas/IncidentLocation" },
					priority: { $ref: "#/components/schemas/IncidentPriority" },
					metadata: {
						$ref: "#/components/schemas/IncidentMetadata",
						nullable: true,
					},
					status: { $ref: "#/components/schemas/Status" },
					reporterId: { type: "string", nullable: true },
					operatorId: { type: "string", nullable: true },
					version: { type: "integer" },
					dispatchedAt: {
						type: "string",
						format: "date-time",
						nullable: true,
					},
					resolvedAt: { type: "string", format: "date-time", nullable: true },
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
				},
				required: [
					"id",
					"type",
					"location",
					"priority",
					"status",
					"version",
					"createdAt",
					"updatedAt",
				],
			},
			NearbyIncident: {
				allOf: [
					{ $ref: "#/components/schemas/Incident" },
					{
						type: "object",
						properties: {
							distance_km: { type: "number" },
						},
						required: ["distance_km"],
					},
				],
			},
			Responder: {
				type: "object",
				properties: {
					id: { type: "integer" },
					name: { type: "string" },
					type: { $ref: "#/components/schemas/ResponderType" },
					status: { $ref: "#/components/schemas/ResponderStatus" },
					location: {
						type: "object",
						nullable: true,
						additionalProperties: true,
					},
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
				},
				required: ["id", "name", "type", "status", "createdAt", "updatedAt"],
			},
			CreateIncidentRequest: {
				type: "object",
				properties: {
					type: { $ref: "#/components/schemas/IncidentType" },
					description: { type: "string" },
					location: { $ref: "#/components/schemas/IncidentLocation" },
					priority: { $ref: "#/components/schemas/IncidentPriority" },
					metadata: { $ref: "#/components/schemas/IncidentMetadata" },
				},
				required: ["type", "location", "priority"],
			},
			UpdateStatusRequest: {
				type: "object",
				properties: {
					status: { $ref: "#/components/schemas/Status" },
				},
				required: ["status"],
			},
			AssignRequest: {
				type: "object",
				properties: {
					operatorId: { type: "string", nullable: true },
				},
				required: ["operatorId"],
			},
			IncidentListResponse: {
				type: "object",
				properties: {
					items: {
						type: "array",
						items: { $ref: "#/components/schemas/Incident" },
					},
					limit: { type: "integer" },
					nextCursor: { type: "string", format: "date-time", nullable: true },
				},
				required: ["items", "limit", "nextCursor"],
			},
			IncidentItemsResponse: {
				type: "object",
				properties: {
					items: {
						type: "array",
						items: { $ref: "#/components/schemas/Incident" },
					},
				},
				required: ["items"],
			},
			NearbyIncidentsResponse: {
				type: "object",
				properties: {
					items: {
						type: "array",
						items: { $ref: "#/components/schemas/NearbyIncident" },
					},
				},
				required: ["items"],
			},
			RespondersResponse: {
				type: "object",
				properties: {
					items: {
						type: "array",
						items: { $ref: "#/components/schemas/Responder" },
					},
				},
				required: ["items"],
			},
			DetailError: {
				type: "object",
				properties: {
					detail: { type: "string" },
				},
				required: ["detail"],
			},
			ValidationError: {
				type: "object",
				properties: {
					detail: { type: "string" },
					errors: { type: "object", additionalProperties: true },
				},
				required: ["detail", "errors"],
			},
		},
	},
	security: [{ bearerAuth: [] }],
	paths: {
		"/": {
			post: {
				tags: ["Incidents"],
				summary: "Create a new incident",
				description:
					"Reporter ID is read from the `x-user-id` request header injected by the API gateway.",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/CreateIncidentRequest" },
						},
					},
				},
				responses: {
					"201": {
						description: "Created incident",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Incident" },
							},
						},
					},
					"400": {
						description: "Validation error",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ValidationError" },
							},
						},
					},
				},
			},
			get: {
				tags: ["Incidents"],
				summary: "List incidents (paginated)",
				parameters: [
					{
						name: "limit",
						in: "query",
						schema: { type: "integer", default: 20, minimum: 1, maximum: 100 },
					},
					{
						name: "cursor",
						in: "query",
						description: "ISO date-time cursor for pagination",
						schema: { type: "string", format: "date-time" },
					},
					{
						name: "status",
						in: "query",
						description: "Filter by status (repeatable)",
						schema: { $ref: "#/components/schemas/Status" },
					},
					{
						name: "type",
						in: "query",
						description: "Filter by incident type code (repeatable)",
						schema: { type: "string" },
					},
					{
						name: "from",
						in: "query",
						description: "Filter by createdAt >= from (ISO date-time)",
						schema: { type: "string", format: "date-time" },
					},
					{
						name: "to",
						in: "query",
						description: "Filter by createdAt <= to (ISO date-time)",
						schema: { type: "string", format: "date-time" },
					},
				],
				responses: {
					"200": {
						description: "Paginated incident list",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/IncidentListResponse" },
							},
						},
					},
				},
			},
		},
		"/open": {
			get: {
				tags: ["Incidents"],
				summary: "List open incidents",
				description:
					"Returns up to 200 incidents with status created, dispatched, or in_progress.",
				responses: {
					"200": {
						description: "Open incidents",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/IncidentItemsResponse",
								},
							},
						},
					},
				},
			},
		},
		"/nearby": {
			get: {
				tags: ["Incidents"],
				summary: "Find active incidents near a GPS coordinate",
				description:
					"Returns up to 50 active (non-resolved, non-cancelled) incidents within the given radius, ordered by distance. Intended for dispatch situational awareness.",
				parameters: [
					{
						name: "lat",
						in: "query",
						required: true,
						schema: { type: "number", minimum: -90, maximum: 90 },
					},
					{
						name: "lng",
						in: "query",
						required: true,
						schema: { type: "number", minimum: -180, maximum: 180 },
					},
					{
						name: "radius",
						in: "query",
						description: "Search radius in km (max 500)",
						schema: { type: "number", minimum: 0, maximum: 500, default: 10 },
					},
				],
				responses: {
					"200": {
						description: "Nearby incidents with distance",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/NearbyIncidentsResponse",
								},
							},
						},
					},
					"400": {
						description: "Validation error",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ValidationError" },
							},
						},
					},
				},
			},
		},
		"/{id}": {
			get: {
				tags: ["Incidents"],
				summary: "Get incident by ID",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "integer" },
					},
				],
				responses: {
					"200": {
						description: "Incident found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Incident" },
							},
						},
					},
					"400": {
						description: "Missing ID",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/DetailError" },
							},
						},
					},
					"404": {
						description: "Incident not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/DetailError" },
							},
						},
					},
				},
			},
		},
		"/{id}/status": {
			put: {
				tags: ["Incidents"],
				summary: "Update incident status",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "integer" },
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/UpdateStatusRequest" },
						},
					},
				},
				responses: {
					"200": {
						description: "Updated incident",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Incident" },
							},
						},
					},
					"400": {
						description: "Validation error or missing ID",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/DetailError" },
							},
						},
					},
					"404": {
						description: "Incident not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/DetailError" },
							},
						},
					},
				},
			},
		},
		"/{id}/assign": {
			put: {
				tags: ["Incidents"],
				summary: "Assign or unassign an operator to an incident",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "integer" },
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/AssignRequest" },
						},
					},
				},
				responses: {
					"200": {
						description: "Updated incident",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Incident" },
							},
						},
					},
					"400": {
						description: "Validation error or missing ID",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/DetailError" },
							},
						},
					},
					"404": {
						description: "Incident not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/DetailError" },
							},
						},
					},
				},
			},
		},
		"/doc": {
			get: {
				tags: ["Docs"],
				summary: "Get OpenAPI document",
				responses: {
					"200": { description: "OpenAPI JSON" },
				},
			},
		},
		"/ui": {
			get: {
				tags: ["Docs"],
				summary: "Swagger UI",
				responses: {
					"200": { description: "Swagger UI" },
				},
			},
		},
	},
} as const;

export { openApiDoc };
