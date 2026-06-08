import { jwtVerify, SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_secret_key_change_me_12345"
);

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  collegeId: string | null;
  [key: string]: any;
}

/**
 * Signs a payload to generate an edge-compatible JWT session token.
 */
export async function signToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

/**
 * Verifies an edge-compatible JWT session token and returns the payload,
 * or null if invalid/expired.
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch (error) {
    return null;
  }
}
