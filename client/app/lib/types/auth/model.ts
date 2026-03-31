import type { components } from "./api";

export type User = components["schemas"]["User"];
export type RegisterPayload = components["schemas"]["RegisterRequest"];
export type LoginPayload = components["schemas"]["LoginRequest"];

export type JwtUser = {
	sub: string;
	name: string;
	role: components["schemas"]["UserRole"];
};

export type ValidationError = components["schemas"]["ValidationError"];
export type DetailError = components["schemas"]["DetailError"];

export type ActionData = {
	detail?: DetailError["detail"];
	errors?: ValidationError["errors"] & {
		properties?: Record<string, { errors?: string[] }>;
	};
};

export type AuthFormValues = LoginPayload &
	Partial<Pick<RegisterPayload, "name" | "affiliation">>;
