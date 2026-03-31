import { type ClassValue, clsx } from "clsx";

export function cn(...input: ClassValue[]) {
	return clsx(input);
}
