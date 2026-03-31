export const openApiDoc = {
	openapi: "3.0.0",
	info: {
		title: "Dispatch API",
		version: "1.0.0",
		description:
			"Dispatch operations for vehicles, drivers, hospital capacity, and live tracking.",
	},
	servers: [{ url: "/api/dispatch" }],
	components: {
		securitySchemes: {
			BearerAuth: {
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
			},
		},
		schemas: {
			VehicleType: {
				type: "string",
				enum: ["ambulance", "fire_truck", "police_car", "motorcycle"],
			},
			VehicleStatus: {
				type: "string",
				enum: [
					"available",
					"dispatched",
					"en_route",
					"on_scene",
					"returning",
					"offline",
				],
			},
			DispatchStatus: {
				type: "string",
				enum: ["active", "arrived", "cleared"],
			},
			StationType: {
				type: "string",
				enum: ["ambulance", "fire", "police"],
			},
			ResourceLocation: {
				type: "object",
				properties: {
					address: { type: "string" },
					lat: { type: "number", minimum: -90, maximum: 90 },
					lng: { type: "number", minimum: -180, maximum: 180 },
				},
				required: ["address", "lat", "lng"],
			},
			Station: {
				type: "object",
				properties: {
					id: { type: "integer" },
					name: { type: "string" },
					type: { $ref: "#/components/schemas/StationType" },
					location: { $ref: "#/components/schemas/ResourceLocation" },
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
				},
				required: ["id", "name", "type", "location", "createdAt", "updatedAt"],
			},
			Driver: {
				type: "object",
				properties: {
					id: { type: "integer" },
					name: { type: "string" },
					phone: { type: "string", nullable: true },
					vehicleId: { type: "integer", nullable: true },
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
				},
				required: ["id", "name", "createdAt", "updatedAt"],
			},
			VehicleLocation: {
				type: "object",
				properties: {
					id: { type: "integer" },
					vehicleId: { type: "integer" },
					lat: { type: "number" },
					lng: { type: "number" },
					speed: { type: "number", nullable: true },
					heading: { type: "number", nullable: true },
					recordedAt: { type: "string", format: "date-time" },
				},
				required: ["id", "vehicleId", "lat", "lng", "recordedAt"],
			},
			Vehicle: {
				type: "object",
				properties: {
					id: { type: "integer" },
					callSign: { type: "string" },
					type: { $ref: "#/components/schemas/VehicleType" },
					status: { $ref: "#/components/schemas/VehicleStatus" },
					stationId: { type: "integer" },
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
					station: { $ref: "#/components/schemas/Station" },
					driver: {
						allOf: [{ $ref: "#/components/schemas/Driver" }],
						nullable: true,
					},
					locations: {
						type: "array",
						items: { $ref: "#/components/schemas/VehicleLocation" },
					},
				},
				required: [
					"id",
					"callSign",
					"type",
					"status",
					"stationId",
					"createdAt",
					"updatedAt",
				],
			},
			Dispatch: {
				type: "object",
				properties: {
					id: { type: "integer" },
					incidentId: { type: "string" },
					vehicleId: { type: "integer" },
					status: { $ref: "#/components/schemas/DispatchStatus" },
					dispatchedAt: { type: "string", format: "date-time" },
					arrivedAt: { type: "string", format: "date-time", nullable: true },
					clearedAt: { type: "string", format: "date-time", nullable: true },
					vehicle: { $ref: "#/components/schemas/Vehicle" },
				},
				required: ["id", "incidentId", "vehicleId", "status", "dispatchedAt"],
			},
			Hospital: {
				type: "object",
				properties: {
					id: { type: "integer" },
					name: { type: "string" },
					location: { $ref: "#/components/schemas/ResourceLocation" },
					totalBeds: { type: "integer" },
					availableBeds: { type: "integer" },
					totalAmbulances: { type: "integer" },
					availableAmbulances: { type: "integer" },
					updatedAt: { type: "string", format: "date-time" },
				},
				required: [
					"id",
					"name",
					"location",
					"totalBeds",
					"availableBeds",
					"totalAmbulances",
					"availableAmbulances",
					"updatedAt",
				],
			},
			RegisterVehicleRequest: {
				type: "object",
				properties: {
					callSign: { type: "string", minLength: 1 },
					type: { $ref: "#/components/schemas/VehicleType" },
					stationId: { type: "integer", minimum: 1 },
					status: { $ref: "#/components/schemas/VehicleStatus" },
				},
				required: ["callSign", "type", "stationId"],
			},
			UpdateVehicleLocationRequest: {
				type: "object",
				properties: {
					lat: { type: "number", minimum: -90, maximum: 90 },
					lng: { type: "number", minimum: -180, maximum: 180 },
					speed: { type: "number", minimum: 0, nullable: true },
					heading: { type: "number", minimum: 0, maximum: 360, nullable: true },
					recordedAt: { type: "string", format: "date-time" },
				},
				required: ["lat", "lng"],
			},
			RegisterDriverRequest: {
				type: "object",
				properties: {
					name: { type: "string", minLength: 1 },
					phone: { type: "string", minLength: 1 },
					vehicleId: { type: "integer", minimum: 1 },
				},
				required: ["name", "vehicleId"],
			},
			UpdateDriverLocationRequest: {
				type: "object",
				properties: {
					lat: { type: "number", minimum: -90, maximum: 90 },
					lng: { type: "number", minimum: -180, maximum: 180 },
					recordedAt: { type: "string", format: "date-time" },
				},
				required: ["lat", "lng"],
			},
			UpdateHospitalCapacityRequest: {
				type: "object",
				minProperties: 1,
				properties: {
					availableBeds: { type: "integer", minimum: 0 },
					totalBeds: { type: "integer", minimum: 0 },
					availableAmbulances: { type: "integer", minimum: 0 },
					totalAmbulances: { type: "integer", minimum: 0 },
				},
			},
			RegisterStationRequest: {
				type: "object",
				properties: {
					name: { type: "string", minLength: 2 },
					type: { $ref: "#/components/schemas/StationType" },
					location: { $ref: "#/components/schemas/ResourceLocation" },
					respondersCount: {
						type: "integer",
						enum: [3, 4],
						default: 4,
					},
				},
				required: ["name", "type", "location"],
			},
			SeedStationsRequest: {
				type: "object",
				properties: {
					reset: { type: "boolean", default: true },
					profile: {
						type: "string",
						enum: ["small", "full"],
						default: "full",
					},
				},
			},
			StationBootstrapResponse: {
				type: "object",
				properties: {
					station: { $ref: "#/components/schemas/Station" },
					respondersCount: { type: "integer" },
					vehicleType: { $ref: "#/components/schemas/VehicleType" },
					vehicles: {
						type: "array",
						items: {
							type: "object",
							properties: {
								id: { type: "integer" },
								callSign: { type: "string" },
								lat: { type: "number" },
								lng: { type: "number" },
							},
							required: ["id", "callSign", "lat", "lng"],
						},
					},
				},
				required: ["station", "respondersCount", "vehicleType", "vehicles"],
			},
			SeedStationsResponse: {
				type: "object",
				properties: {
					profile: { type: "string", enum: ["small", "full"] },
					reset: { type: "boolean" },
					stationsCreated: { type: "integer" },
					vehiclesCreated: { type: "integer" },
					respondersCreated: { type: "integer" },
					stations: {
						type: "array",
						items: {
							type: "object",
							properties: {
								id: { type: "integer" },
								name: { type: "string" },
								type: { $ref: "#/components/schemas/StationType" },
								respondersCount: { type: "integer" },
								vehicleType: { $ref: "#/components/schemas/VehicleType" },
							},
							required: [
								"id",
								"name",
								"type",
								"respondersCount",
								"vehicleType",
							],
						},
					},
				},
				required: [
					"profile",
					"reset",
					"stationsCreated",
					"vehiclesCreated",
					"respondersCreated",
					"stations",
				],
			},
			VehicleLocationListResponse: {
				type: "object",
				properties: {
					items: {
						type: "array",
						items: { $ref: "#/components/schemas/VehicleLocation" },
					},
					nextCursor: { type: "integer", nullable: true },
				},
				required: ["items", "nextCursor"],
			},
			ValidationError: {
				type: "object",
				properties: {
					detail: {
						oneOf: [
							{ type: "string" },
							{ type: "object", additionalProperties: true },
						],
					},
					errors: { type: "object", additionalProperties: true },
				},
				required: ["detail"],
			},
			DetailError: {
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
		"/dispatches/active": {
			get: {
				tags: ["Dispatch"],
				summary: "List active dispatches",
				responses: {
					"200": {
						description: "Active dispatch records",
						content: {
							"application/json": {
								schema: {
									type: "array",
									items: { $ref: "#/components/schemas/Dispatch" },
								},
							},
						},
					},
				},
			},
		},
		"/dispatches/{id}/arrive": {
			post: {
				tags: ["Dispatch"],
				summary: "Mark dispatch as arrived",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "integer", minimum: 1 },
					},
				],
				responses: {
					"200": {
						description: "Dispatch updated to arrived",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Dispatch" },
							},
						},
					},
					"400": {
						description: "Invalid dispatch id",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/DetailError" },
							},
						},
					},
					"404": {
						description: "Dispatch not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/DetailError" },
							},
						},
					},
				},
			},
		},
		"/vehicles": {
			get: {
				tags: ["Vehicles"],
				summary: "List vehicles with latest location",
				responses: {
					"200": {
						description: "Vehicles",
						content: {
							"application/json": {
								schema: {
									type: "array",
									items: { $ref: "#/components/schemas/Vehicle" },
								},
							},
						},
					},
				},
			},
		},
		"/stations": {
			get: {
				tags: ["Stations"],
				summary: "List stations",
				responses: {
					"200": {
						description: "Stations",
						content: {
							"application/json": {
								schema: {
									type: "array",
									items: { $ref: "#/components/schemas/Station" },
								},
							},
						},
					},
				},
			},
		},
		"/stations/register": {
			post: {
				tags: ["Stations"],
				summary: "Register a station and bootstrap responders",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/RegisterStationRequest" },
						},
					},
				},
				responses: {
					"201": {
						description: "Station created and responders provisioned",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/StationBootstrapResponse",
								},
							},
						},
					},
					"400": {
						description: "Validation failed",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ValidationError" },
							},
						},
					},
				},
			},
		},
		"/stations/seed": {
			post: {
				tags: ["Stations"],
				summary: "Seed demo stations and responders",
				requestBody: {
					required: false,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/SeedStationsRequest" },
						},
					},
				},
				responses: {
					"200": {
						description: "Seed completed",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/SeedStationsResponse" },
							},
						},
					},
					"400": {
						description: "Validation failed",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ValidationError" },
							},
						},
					},
				},
			},
		},
		"/vehicles/register": {
			post: {
				tags: ["Vehicles"],
				summary: "Register a new vehicle",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/RegisterVehicleRequest" },
						},
					},
				},
				responses: {
					"201": {
						description: "Vehicle registered",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Vehicle" },
							},
						},
					},
					"400": {
						description: "Validation failed",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ValidationError" },
							},
						},
					},
					"404": {
						description: "Station not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/DetailError" },
							},
						},
					},
					"409": {
						description: "Vehicle callSign already exists",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/DetailError" },
							},
						},
					},
				},
			},
		},
		"/vehicles/{id}": {
			get: {
				tags: ["Vehicles"],
				summary: "Get a vehicle by id",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "integer", minimum: 1 },
					},
				],
				responses: {
					"200": {
						description: "Vehicle record",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Vehicle" },
							},
						},
					},
					"400": {
						description: "Invalid vehicle id",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/DetailError" },
							},
						},
					},
					"404": {
						description: "Vehicle not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/DetailError" },
							},
						},
					},
				},
			},
		},
		"/vehicles/{id}/location": {
			get: {
				tags: ["Vehicles"],
				summary: "List historical vehicle locations",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "integer", minimum: 1 },
					},
					{
						name: "limit",
						in: "query",
						schema: { type: "integer", minimum: 1, maximum: 200, default: 50 },
					},
					{
						name: "cursor",
						in: "query",
						description: "Location row id cursor for pagination",
						schema: { type: "integer", minimum: 1 },
					},
					{
						name: "from",
						in: "query",
						description: "ISO date-time lower bound for recordedAt",
						schema: { type: "string", format: "date-time" },
					},
					{
						name: "to",
						in: "query",
						description: "ISO date-time upper bound for recordedAt",
						schema: { type: "string", format: "date-time" },
					},
				],
				responses: {
					"200": {
						description: "Location history",
						content: {
							"application/json": {
								schema: {
									$ref: "#/components/schemas/VehicleLocationListResponse",
								},
							},
						},
					},
					"400": {
						description: "Invalid path/query parameter",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/DetailError" },
							},
						},
					},
				},
			},
			post: {
				tags: ["Vehicles"],
				summary: "Add a vehicle location point",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "integer", minimum: 1 },
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								$ref: "#/components/schemas/UpdateVehicleLocationRequest",
							},
						},
					},
				},
				responses: {
					"201": {
						description: "Vehicle location created",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/VehicleLocation" },
							},
						},
					},
					"400": {
						description: "Validation failed",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ValidationError" },
							},
						},
					},
					"404": {
						description: "Vehicle not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/DetailError" },
							},
						},
					},
				},
			},
		},
		"/drivers/register": {
			post: {
				tags: ["Drivers"],
				summary: "Register a driver and link to a vehicle",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/RegisterDriverRequest" },
						},
					},
				},
				responses: {
					"201": {
						description: "Driver registered",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Driver" },
							},
						},
					},
					"400": {
						description: "Validation failed",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ValidationError" },
							},
						},
					},
					"404": {
						description: "Vehicle not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/DetailError" },
							},
						},
					},
					"409": {
						description: "Vehicle already has a driver",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/DetailError" },
							},
						},
					},
				},
			},
		},
		"/drivers/{id}/location": {
			post: {
				tags: ["Drivers"],
				summary: "Add a driver location point",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "integer", minimum: 1 },
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								$ref: "#/components/schemas/UpdateDriverLocationRequest",
							},
						},
					},
				},
				responses: {
					"201": {
						description: "Driver location created",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										id: { type: "integer" },
										driverId: { type: "integer" },
										lat: { type: "number" },
										lng: { type: "number" },
										recordedAt: { type: "string", format: "date-time" },
									},
									required: ["id", "driverId", "lat", "lng", "recordedAt"],
								},
							},
						},
					},
					"400": {
						description: "Validation failed",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ValidationError" },
							},
						},
					},
					"404": {
						description: "Driver not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/DetailError" },
							},
						},
					},
				},
			},
		},
		"/hospital/{id}/capacity": {
			put: {
				tags: ["Hospital"],
				summary: "Update hospital capacity figures",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "integer", minimum: 1 },
					},
				],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								$ref: "#/components/schemas/UpdateHospitalCapacityRequest",
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Hospital capacity updated",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Hospital" },
							},
						},
					},
					"400": {
						description: "Missing or invalid input",
						content: {
							"application/json": {
								schema: {
									oneOf: [
										{ $ref: "#/components/schemas/DetailError" },
										{ $ref: "#/components/schemas/ValidationError" },
									],
								},
							},
						},
					},
					"404": {
						description: "Hospital not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/DetailError" },
							},
						},
					},
				},
			},
		},
		"/tracking/live": {
			get: {
				tags: ["Tracking"],
				summary: "Stream live tracking updates via Server-Sent Events",
				responses: {
					"200": {
						description: "SSE stream connection",
						content: {
							"text/event-stream": {
								schema: {
									type: "string",
									example: 'data: {\\"type\\":\\"connected\\"}\\n\\n',
								},
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
