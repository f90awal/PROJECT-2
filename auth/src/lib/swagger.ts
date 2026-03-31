const openApiDoc = {
	openapi: "3.0.0",
	info: {
		title: "Auth API",
		version: "1.0.0",
		description: "Auth and profile endpoints",
	},
	servers: [{ url: "/api/auth" }],
	components: {
		securitySchemes: {
			BearerAuth: {
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
			},
		},
		schemas: {
			UserRole: {
				type: "string",
				enum: ["super", "admin"],
			},
			Affiliation: {
				type: "string",
				enum: ["police", "fire", "hospital", "system"],
			},
			User: {
				type: "object",
				properties: {
					id: { type: "integer", format: "int64" },
					name: { type: "string" },
					email: { type: "string", format: "email" },
					role: { $ref: "#/components/schemas/UserRole" },
					affiliation: { $ref: "#/components/schemas/Affiliation" },
					isActive: { type: "boolean" },
					createdAt: { type: "string", format: "date-time" },
					updatedAt: { type: "string", format: "date-time" },
					lastLogin: { type: "string", format: "date-time", nullable: true },
				},
				required: [
					"id",
					"name",
					"email",
					"role",
					"affiliation",
					"isActive",
					"createdAt",
					"updatedAt",
				],
			},
			RegisterRequest: {
				type: "object",
				properties: {
					name: { type: "string", minLength: 1 },
					email: { type: "string", format: "email" },
					password: { type: "string", format: "password", minLength: 8 },
					affiliation: { $ref: "#/components/schemas/Affiliation" },
					role: { $ref: "#/components/schemas/UserRole" },
				},
				required: ["name", "email", "affiliation", "role", "password"],
			},
			LoginRequest: {
				type: "object",
				properties: {
					email: { type: "string", format: "email" },
					password: { type: "string", format: "password", minLength: 8 },
				},
				required: ["email", "password"],
			},
			UpdateProfileRequest: {
				type: "object",
				minProperties: 1,
				properties: {
					name: { type: "string", minLength: 1 },
					affiliation: { $ref: "#/components/schemas/Affiliation" },
				},
			},
			ValidationError: {
				type: "object",
				properties: {
					errors: { type: "object", additionalProperties: true },
				},
				required: ["errors"],
			},
			DetailError: {
				type: "object",
				properties: {
					detail: { type: "string" },
				},
				required: ["detail"],
			},
			TokenResponse: {
				type: "object",
				properties: {
					token: { type: "string" },
				},
				required: ["token"],
			},
			UserResponse: {
				type: "object",
				properties: {
					user: { $ref: "#/components/schemas/User" },
				},
				required: ["user"],
			},
		},
	},
	paths: {
		"/register": {
			post: {
				tags: ["Auth"],
				summary: "Register a new user",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/RegisterRequest" },
						},
					},
				},
				responses: {
					"201": {
						description: "User created",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/UserResponse" },
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
					"409": {
						description: "User already exists",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/DetailError" },
							},
						},
					},
				},
			},
		},
		"/login": {
			post: {
				tags: ["Auth"],
				summary: "Login with email and password",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/LoginRequest" },
						},
					},
				},
				responses: {
					"200": {
						description: "Login successful",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/TokenResponse" },
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
					"401": {
						description: "Invalid credentials",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/DetailError" },
							},
						},
					},
				},
			},
		},
		"/profile": {
			get: {
				tags: ["Profile"],
				summary: "Get current user profile",
				security: [{ BearerAuth: [] }],
				responses: {
					"200": {
						description: "Current profile",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/UserResponse" },
							},
						},
					},
					"401": {
						description: "Not authorized",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/DetailError" },
							},
						},
					},
					"404": {
						description: "User not found",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/DetailError" },
							},
						},
					},
				},
			},
			put: {
				tags: ["Profile"],
				summary: "Update current user profile",
				security: [{ BearerAuth: [] }],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/UpdateProfileRequest" },
						},
					},
				},
				responses: {
					"200": {
						description: "Updated profile",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/UserResponse" },
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
					"401": {
						description: "Not authorized",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/DetailError" },
							},
						},
					},
					"403": {
						description: "Forbidden",
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
					"200": {
						description: "OpenAPI JSON",
					},
				},
			},
		},
		"/ui": {
			get: {
				tags: ["Docs"],
				summary: "Swagger UI",
				responses: {
					"200": {
						description: "Swagger UI",
					},
				},
			},
		},
	},
} as const;

export { openApiDoc };
