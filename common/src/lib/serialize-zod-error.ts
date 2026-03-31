import type { ZodError } from "zod";

export function serializeZodError<T>(error: ZodError<T>) {
	return error.errors.map((e) => ({
		path: e.path.join("."),
		message: e.message,
	}));
}
