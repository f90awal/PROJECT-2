import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";

function unauthorized(c: Context) {
    return c.json({ detail: "not authorized" }, 401);
}

export const authenticate = createMiddleware(async (c, next) => {
    const authHeader = c.req.header("Authorization") ?? "";

    if (!authHeader.startsWith("Bearer ")) {
        return unauthorized(c);
    }

    const token = authHeader.slice("Bearer ".length).trim();

    try {
        const payload = await verify(
            token,
            process.env.JWT_PUBLIC_KEY!,
            "RS256",
        );

        // make JWT claims available to downstream handlers
        c.set("user", payload);

        return await next();
    } catch {
        return unauthorized(c);
    }
});