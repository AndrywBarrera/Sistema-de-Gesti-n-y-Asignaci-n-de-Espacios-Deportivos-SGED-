import { Context, create, getNumericDate } from "../deps.ts";
import { createKey } from "../utils/crypto.ts";
import * as userService from "../services/userService.ts";

export const loginUser = async (ctx: Context) => {
    const { value } = ctx.request.body({ type: "json" });
    const { email, password } = await value;

    const user = await userService.authenticateUser(email, password);

    if (!user) {
        ctx.response.status = 401;
        ctx.response.body = { message: "Credenciales inválidas" };
        return;
    }

    const key = await createKey(Deno.env.get("JWT_SECRET") || "defaultSecret");

    const jwt = await create(
        { alg: "HS256", typ: "JWT" },
        {
            id: user._id.toString(),
            email: user.email,
            exp: getNumericDate(60 * 60),
        },
        key,
    );

    ctx.response.body = {
        message: "Login exitoso",
        token: jwt,
    };
};

export const registerUser = async (ctx: Context) => {
    try {
        const { value } = ctx.request.body({ type: "json" });
        const {
            username,
            firstName,
            lastName,
            password,
            email,
            phone,
            document,
            role,
            dateBirth,
        } = await value;

        if (
            !username || !firstName || !lastName || !password || !email ||
            !phone || !document || !dateBirth
        ) {
            ctx.response.status = 400;
            ctx.response.body = { message: "Faltan datos necesarios" };
            return;
        }

        if (!Array.isArray(role) || role.length === 0) {
            ctx.response.status = 400;
            ctx.response.body = {
                message: "El campo 'role' debe contener al menos un rol",
            };
            return;
        }

        const existingUser = await userService.searchUser(
            username,
            email,
            document,
        );

        if (existingUser) {
            const takenFields = [];
            if (existingUser.username === username) {
                takenFields.push("username");
            }
            if (existingUser.email === email) takenFields.push("email");
            if (existingUser.document === document) {
                takenFields.push("document");
            }

            ctx.response.status = 400;
            ctx.response.body = {
                message: `Los siguientes datos ya están registrados: ${
                    takenFields.join(", ")
                }`,
            };
            return;
        }

        const hashedPassword = userService.hashPassword(password);
        const id = crypto.randomUUID();

        const userData = {
            _id: id,
            username,
            firstName,
            lastName,
            email,
            phone,
            document,
            role,
            dateBirth,
            image: {},
        };

        const registerData = {
            _id: id,
            email,
            password: hashedPassword,
            username,
        };

        await userService.createUser(userData, registerData);

        ctx.response.status = 201;
        ctx.response.body = {
            message: "Usuario creado exitosamente",
            ...userData,
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = {
            message: `Fallo al crear usuario: ${
                error instanceof Error ? error.message : "Error desconocido"
            }`,
        };
    }
};

export const getUsers = async (ctx: Context) => {
    const users = await userService.getAllUsers();
    ctx.response.body = {
        success: true,
        data: users,
    };
};
