<<<<<<< HEAD
export async function createKey(secret: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);

    return await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"],
    );
}

export async function generateSignature(
    params: Record<string, string>,
    apiSecret: string,
): Promise<string> {
    const sortedParams = Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join("&");

    const encoder = new TextEncoder();
    const keyData = encoder.encode(apiSecret);
    const data = encoder.encode(sortedParams);

    const key = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-1" },
        false,
        ["sign"],
    );

    const signature = await crypto.subtle.sign("HMAC", key, data);
    const hashBytes = new Uint8Array(signature);

    return Array.from(hashBytes).map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
=======
export async function createKey(secret: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);

    return await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"],
    );
}

export async function generateSignature(
    params: Record<string, string>,
    apiSecret: string,
): Promise<string> {
    const sortedParams = Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join("&");

    const encoder = new TextEncoder();
    const keyData = encoder.encode(apiSecret);
    const data = encoder.encode(sortedParams);

    const key = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-1" },
        false,
        ["sign"],
    );

    const signature = await crypto.subtle.sign("HMAC", key, data);
    const hashBytes = new Uint8Array(signature);

    return Array.from(hashBytes).map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
>>>>>>> master
