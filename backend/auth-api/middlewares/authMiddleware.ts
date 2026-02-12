<<<<<<< HEAD
import { verify } from "../deps.ts";
import type { Context } from "../deps.ts";
import { createKey } from "../utils/crypto.ts";

export const authMiddleware = async (
    ctx: Context,
    next: () => Promise<unknown>,
) => {
    const token = ctx.request.headers.get("Authorization")?.split(" ")[1];

    if (!token) {
        ctx.response.status = 401;
        ctx.response.body = {
            success: false,
            message: "Token no proporcionado",
        };
        return;
    }

    try {
        const key = await createKey(
            Deno.env.get("JWT_SECRET") || "defaultSecret",
        );

        const payload = await verify(token, key);

        ctx.state.user = payload;
        await next();
    } catch (_err) {
        ctx.response.status = 401;
        ctx.response.body = {
            success: false,
            message: "Token inválido o expirado",
        };
    }
};
=======
import { verify } from "../deps.ts";
import type { Context } from "../deps.ts";
import { createKey } from "../utils/crypto.ts";

export const authMiddleware = async (
    ctx: Context,
    next: () => Promise<unknown>,
) => {
    const token = ctx.request.headers.get("Authorization")?.split(" ")[1];

    if (!token) {
        ctx.response.status = 401;
        ctx.response.body = {
            success: false,
            message: "Token no proporcionado",
        };
        return;
    }

    try {
        const key = await createKey(
            Deno.env.get("JWT_SECRET") || "defaultSecret",
        );

        const payload = await verify(token, key);

        ctx.state.user = payload;
        await next();
    } catch (_err) {
        ctx.response.status = 401;
        ctx.response.body = {
            success: false,
            message: "Token inválido o expirado",
        };
    }
};
>>>>>>> master
