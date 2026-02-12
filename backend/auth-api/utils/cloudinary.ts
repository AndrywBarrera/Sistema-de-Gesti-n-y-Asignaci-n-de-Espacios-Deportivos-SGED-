import { generateSignature } from "./crypto.ts";

export async function uploadToCloudinary(file: Uint8Array, filename: string) {
    const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME")!;
    const uploadPreset = Deno.env.get("CLOUDINARY_UPLOAD_PRESET")!;
    const apiKey = Deno.env.get("CLOUDINARY_API_KEY")!;
    const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET")!;

    const timestamp = Math.floor(Date.now() / 1000).toString();

    const paramsToSign = {
        timestamp,
        upload_preset: uploadPreset,
    };

    const signature = await generateSignature(paramsToSign, apiSecret);

    const form = new FormData();
    form.append("file", new Blob([file]), filename);
    form.append("upload_preset", uploadPreset);
    form.append("timestamp", timestamp);
    form.append("api_key", apiKey);
    form.append("signature", signature);

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
        {
            method: "POST",
            body: form,
        },
    );

    if (!res.ok) {
        throw new Error(`Error al subir a Cloudinary: ${res.statusText}`);
    }

    return await res.json();
}
