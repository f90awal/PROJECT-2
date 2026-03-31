import { z } from "zod";

const AffiliationEnum = z.enum(["police", "fire", "hospital", "system"]);
const RoleEnum = z.enum(["super", "admin"]);

export const RegisterSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.email("Invalid email address"),
	affiliation: AffiliationEnum,
	role: RoleEnum,
	password: z.string().min(8, "Password must be at least 8 characters long"),
});

export const LoginSchema = z.object({
	email: z.email("Invalid email address"),
	password: z.string().min(8, "Password must be at least 8 characters long"),
});

export const UpdateProfileSchema = z
	.object({
		name: z.string().min(1, "Name is required").optional(),
		affiliation: AffiliationEnum.optional(),
	})
	.refine((data) => data.name !== undefined || data.affiliation !== undefined, {
		message: "At least one field must be provided",
	});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
