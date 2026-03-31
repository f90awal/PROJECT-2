import type { LoaderFunctionArgs } from "react-router";
import { clearAuth } from "~/lib/auth";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	return await clearAuth(request);
};
