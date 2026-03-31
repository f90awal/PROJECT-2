import { createCookie } from "react-router";

export const MAX_COOKIE_AGE = 60 * 60 * 24 * 14; // 14 days

export const userPrefs = createCookie("user-prefs", {
	maxAge: MAX_COOKIE_AGE,
});

export const authCookie = createCookie("auth", {
	maxAge: MAX_COOKIE_AGE,
	httpOnly: true,
	secure: true,
	sameSite: "lax",
});
