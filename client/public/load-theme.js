(() => {
  const value = localStorage.getItem("@mw/theme");
  const pref = value ? JSON.parse(value) : null

	if (["light", "dark"].includes(pref)) {
		document.documentElement.classList.add(pref);
	}

	if (pref === "system") {
		const query = window.matchMedia("(prefers-color-scheme: dark)");
		if (query.matches) {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.add("light");
		}
	}
})();
