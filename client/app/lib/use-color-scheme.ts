import { useAtom } from "jotai";
import React, { useState } from "react";
import { colorScheme, colorSchemePreference } from "~/lib/store";
import { pref } from "./client-preference";

function useColorScheme() {
	const [scheme, setScheme] = useAtom(colorScheme);
	const [preference, setPreference] = useAtom(colorSchemePreference);

	const [loaded, setLoaded] = useState(false);

	React.useEffect(() => {
		const preference = pref.get("@mw/theme");
		if (preference) setPreference(preference);
		setLoaded(true);
	}, [setPreference]);

	React.useEffect(() => {
		if (!loaded) return;

		if (preference === "system") {
			const handleChange = (e: MediaQueryListEvent) => {
				setScheme(e.matches ? "dark" : "light");
			};

			const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
			mediaQuery.addEventListener("change", handleChange);

			setScheme(mediaQuery.matches ? "dark" : "light");
			pref.set("@mw/theme", "system");

			return () => mediaQuery.removeEventListener("change", handleChange);
		}

		setScheme(preference);
		pref.set("@mw/theme", preference);
	}, [preference, loaded, setScheme]);

	React.useEffect(() => {
		if (scheme === "light") {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		}

		if (scheme === "dark") {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
		}
	}, [scheme]);

	return { scheme, setPreference, preference };
}

export { useColorScheme };
