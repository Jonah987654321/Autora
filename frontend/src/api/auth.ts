import client from "./client";

export async function login(email: string, password: string) {
    try {
        const response = await client.post("/auth/login", {
            "email": email,
            "password": password
        });
        return response.data
    } catch (error) {

    }
}

export async function refresh() {
    try {
        const response = await client.post("/auth/refresh");
        return response.data
    } catch (error) {

    }
}
