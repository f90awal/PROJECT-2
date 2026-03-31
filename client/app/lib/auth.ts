import { authCookie } from "./cookies.server";

async function clearAuth(request: Request) {
	return new Response(null, {
		headers: {
			"Set-Cookie": await authCookie.serialize({}),
			Location: "/",
		},
		status: 302,
	});
}

export { clearAuth };
