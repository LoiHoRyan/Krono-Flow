import { getAuthenticatedUser } from "@/lib/auth";

export async function getOrCreateDemoUser() {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
