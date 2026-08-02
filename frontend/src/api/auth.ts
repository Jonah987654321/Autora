import { client } from "./client";

export async function login(email: string, password: string) {
  const response = await client.post("/auth/login", {
    email: email,
    password: password,
  });
  return response.data;
}

export async function register(
  fullName: string,
  email: string,
  password: string,
) {
  const response = await client.post("/auth/signup", {
    email: email,
    password: password,
    fullName: fullName,
  });
  return response.data;
}

export async function logout() {
  await client.post("/auth/logout");
}

let inFlightRefresh: Promise<{ accessToken: string }> | null = null;
export function refresh() {
    if (!inFlightRefresh) {
        inFlightRefresh = client
          .post("/auth/refresh")
          .then((response) => response.data)
          .finally(() => {
            inFlightRefresh = null;
          });
    }
    return inFlightRefresh;
}