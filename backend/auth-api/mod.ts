import { Application } from "./deps.ts";
import { oakCors } from "./deps.ts";
import { config, STATUS_TEXT } from "./deps.ts";
import { bold, cyan, green, magenta, red, white, yellow } from "./deps.ts";
import router from "./routes/userRoutes.ts"; // asegúrate de tener esta ruta

config({ export: true });

function formatDate(date = new Date()) {
    const pad = (n: number) => n.toString().padStart(2, "0");

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hour = pad(date.getHours());
    const minute = pad(date.getMinutes());
    const second = pad(date.getSeconds());

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

const app = new Application();
app.use(oakCors());
app.use(async (ctx, next) => {
    const start = Date.now();
    await next();

    const status = ctx.response.status;
    const method = ctx.request.method;
    const url = ctx.request.url;
    const ip = ctx.request.ip ?? "desconocido";
    const statusText = STATUS_TEXT[status as keyof typeof STATUS_TEXT] ??
        "Unknown";

    const userId = ctx.state.user?.id;
    const expTimestamp = ctx.state.user?.exp;

    const methodColor = method === "GET"
        ? green(method)
        : method === "POST"
        ? yellow(method)
        : method === "PUT"
        ? magenta(method)
        : red(method);
    const methodUrlColor = method === "GET"
        ? green(url.pathname)
        : method === "POST"
        ? yellow(url.pathname)
        : method === "PUT"
        ? magenta(url.pathname)
        : red(url.pathname);

    const statusTextColor = status >= 500
        ? red(statusText)
        : status >= 400
        ? yellow(statusText)
        : green(statusText);

    const statusColor = status >= 500
        ? red(status.toString())
        : status >= 400
        ? yellow(status.toString())
        : green(status.toString());

    const dateMs = Date.now() - start;
    let logMessage = `${bold(white(`[${formatDate()}]`))} ${
        bold(methodColor)
    } ${methodUrlColor} - ${bold(cyan("IP:"))} ${white(ip)} - ${statusColor} ${
        bold(statusTextColor)
    } - ${white(dateMs.toString())}${white("ms")}`;

    if (userId && typeof expTimestamp === "number") {
        const expFormatted = new Date(expTimestamp * 1000).toLocaleString(
            "es-CO",
            {
                timeZone: "America/Bogota",
            },
        );
        logMessage += ` - ${bold(cyan("Usuario:"))} ${white(userId)} - ${
            bold(cyan("Expira:"))
        } ${white(expFormatted)}`;
    }

    console.log(logMessage);
});
app.use(router.routes());
app.use(router.allowedMethods());

const port = Deno.env.get("PORT") || 8000;
console.log(`Servidor escuchando en http://localhost:${port}`);
await app.listen({ port: +port });
