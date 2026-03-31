import type { AppTheme } from "~/lib/store";
import { useColorScheme } from "~/lib/use-color-scheme";
import { cn } from "~/lib/utils";

function ThemeSelector() {
	const { setPreference, preference } = useColorScheme();

	function switchTheme(theme: AppTheme) {
		setPreference(theme);
	}

	return (
		<div className="flex gap-px rounded border border-stone-200 dark:border-stone-700 p-0.5 bg-stone-100 dark:bg-stone-800">
			<button
				type="button"
				onClick={() => switchTheme("system")}
				className={cn("rounded p-1 transition-colors", {
					"bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900": preference === "system",
					"text-stone-400 hover:text-stone-600 dark:hover:text-stone-300": preference !== "system",
				})}
			>
				<div className="i-lucide-monitor-cog size-3.5" />
			</button>
			<button
				type="button"
				onClick={() => switchTheme("light")}
				className={cn("rounded p-1 transition-colors", {
					"bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900": preference === "light",
					"text-stone-400 hover:text-stone-600 dark:hover:text-stone-300": preference !== "light",
				})}
			>
				<div className="i-lucide-sun size-3.5" />
			</button>
			<button
				type="button"
				onClick={() => switchTheme("dark")}
				className={cn("rounded p-1 transition-colors", {
					"bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900": preference === "dark",
					"text-stone-400 hover:text-stone-600 dark:hover:text-stone-300": preference !== "dark",
				})}
			>
				<div className="i-lucide-moon size-3.5" />
			</button>
		</div>
	);
}

export default ThemeSelector;
