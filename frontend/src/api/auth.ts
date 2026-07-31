import client from "./client";

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
  const response = await client.post("/auth/register", {
    email: email,
    password: password,
    fullName: fullName,
  });
  return response.data;
}

export async function logout() {
  await client.post("/auth/logout");
}

export async function refresh() {
  const response = await client.post("/auth/refresh");
  return response.data;
}
