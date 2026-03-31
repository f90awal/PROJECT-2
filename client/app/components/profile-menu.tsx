import { Link, useRouteLoaderData } from "react-router";
import type { loader as rootLoader } from "~/root";
import ThemeSelector from "./theme-selector";

function ProfileMenu() {
	const { user } = useRouteLoaderData<typeof rootLoader>("root") || {};

	return (
		<div className="bg-white dark:bg-stone-900 rounded border border-stone-200 dark:border-stone-700 w-56 overflow-hidden shadow-xl mt-1 font-mono">
			<header className="px-4 py-3 border-b border-stone-100 dark:border-stone-800">
				<div className="flex items-center justify-between mb-2.5">
					<span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500 border border-stone-200 dark:border-stone-700 px-1.5 py-0.5 rounded">
						{user?.role}
					</span>
					<ThemeSelector />
				</div>
				<p className="text-sm font-medium text-stone-800 dark:text-stone-200 capitalize truncate">
					{user?.name}
				</p>
				<div className="flex items-center gap-1.5 mt-0.5">
					<p className="text-xs text-stone-400 dark:text-stone-500 truncate">
						{user?.email}
					</p>
					<div className="i-solar-verified-check-bold size-3.5 text-emerald-500 shrink-0" />
				</div>
			</header>

			<div>
				<Link
					to="/logout"
					className="flex gap-2 items-center px-4 py-2.5 text-xs text-red-500 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
				>
					<div className="i-solar-logout-2-linear size-3.5" />
					Sign out
				</Link>
			</div>
		</div>
	);
}

export { ProfileMenu };
