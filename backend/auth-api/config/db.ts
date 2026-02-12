<<<<<<< HEAD
import { MongoClient } from "../deps.ts";

export const connect = async () => {
    const mongoUri = Deno.env.get("MONGO_URI");
    const mongoDbName = Deno.env.get("MONGO_DB");

    if (!mongoUri || !mongoDbName) {
        throw new Error("Faltan variables MONGO en el .env");
    }
    const fullUri =
        `${mongoUri}/${mongoDbName}?authMechanism=SCRAM-SHA-1&retryWrites=true&w=majority`;

    const client = new MongoClient();

    await client.connect(fullUri);
    console.log("Conexión establecida a MongoDB");

    return client.database(mongoDbName);
};
=======
import { MongoClient } from "../deps.ts";

export const connect = async () => {
    const mongoUri = Deno.env.get("MONGO_URI");
    const mongoDbName = Deno.env.get("MONGO_DB");

    if (!mongoUri || !mongoDbName) {
        throw new Error("Faltan variables MONGO en el .env");
    }
    const fullUri =
        `${mongoUri}/${mongoDbName}?authMechanism=SCRAM-SHA-1&retryWrites=true&w=majority`;

    const client = new MongoClient();

    await client.connect(fullUri);
    console.log("Conexión establecida a MongoDB");

    return client.database(mongoDbName);
};
>>>>>>> master
