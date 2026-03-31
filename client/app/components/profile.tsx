import { useRouteLoaderData } from "react-router";
import type { loader as rootLoader } from "~/root";
import { Avatar } from "./avatar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { ProfileMenu } from "./profile-menu";

function Profile() {
	const { user } = useRouteLoaderData<typeof rootLoader>("root") || {};

	if (!user) return null;

	return (
		<Popover placement="bottom-end">
			<PopoverTrigger asChild>
				<div className="shrink-0 rounded bg-stone-800 dark:bg-stone-900 border border-stone-700 dark:border-stone-800 hover:border-stone-500 p-1 cursor-pointer transition-colors">
					<Avatar name={user.name} />
				</div>
			</PopoverTrigger>
			<PopoverContent className="z-100">
				<ProfileMenu />
			</PopoverContent>
		</Popover>
	);
}

export { Profile };
