type AppTheme = "light" | "dark" | "system";

type Pref = {
	"@mw/theme": AppTheme;
};

type PrefKey = keyof Pref;

const pref = {
	get<T extends PrefKey>(key: T): Pref[T] | undefined {
		const value = localStorage.getItem(key);
		if (!value) return;

		return JSON.parse(value);
	},
	set<T extends PrefKey>(key: T, value: Pref[T]) {
		localStorage.setItem(key as string, JSON.stringify(value));
	},
};

export { pref };
