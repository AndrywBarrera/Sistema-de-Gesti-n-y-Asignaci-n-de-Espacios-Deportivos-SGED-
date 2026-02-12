import { connect } from "../config/db.ts";
import { argon2Hash, decodeHex, encodeHex } from "../deps.ts";

const dataBase = await connect();
const usersAuthCollection = dataBase.collection(
    Deno.env.get("DB_USERS_AUTH") || "users",
);
const usersInfoCollection = dataBase.collection(
    Deno.env.get("DB_USERS_INFO") || "users",
);
export async function searchUser(
    username: string,
    email: string,
    document: string,
) {
    const user = await usersInfoCollection.findOne({
        $or: [
            { username },
            { email },
            { document },
        ],
    });
    return user;
}
export async function createUser(user: object, userAuth: object) {
    try {
        await usersInfoCollection.insertOne(user);
        await usersAuthCollection.insertOne(userAuth);
    } catch (error) {
        console.error("Error al insertar usuario:", error);
        throw new Error("Error al crear el usuario");
    }
}
export async function authenticateUser(email: string, password: string) {
    const user = await usersAuthCollection.findOne({ email });
    if (!user) return null;

    const isValid = verifyPassword(password, user.password);
    return isValid ? user : null;
}

export async function getAllUsers() {
    return await usersInfoCollection.find({}).toArray();
}

export function hashPassword(password: string): string {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hashed = new Uint8Array(argon2Hash(encoder.encode(password), salt));

    const saltHex = encodeHex(salt);
    const hashedHex = encodeHex(hashed);

    return `${saltHex}:${hashedHex}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
    const [saltHex, hashHex] = storedHash.split(":");

    if (!saltHex || !hashHex) return false;

    const salt = decodeHex(saltHex);
    const encoder = new TextEncoder();

    const hashed = new Uint8Array(argon2Hash(encoder.encode(password), salt));
    const hashedHex = encodeHex(hashed);

    return hashHex === hashedHex;
}
