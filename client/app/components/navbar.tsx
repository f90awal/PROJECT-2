import { useRouteLoaderData } from "react-router";
import type { loader as rootLoader } from "~/root";
import { AuthNav } from "./auth-nav";

function Navbar() {
	const { user } = useRouteLoaderData<typeof rootLoader>("root") || {};

	return user && <AuthNav />;
}

export { Navbar };
