
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";

const allowedTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/quicktime"
]);

let cachedCerts = null;
let certExpiry = 0;

async function getFirebaseCerts() {
  if (cachedCerts && Date.now() < certExpiry) return cachedCerts;

  const response = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
  );

  if (!response.ok) throw new Error("Could not fetch Firebase verification keys");

  cachedCerts = await response.json();

  const cacheControl = response.headers.get("cache-control") || "";
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/)?.[1] || 3600);
  certExpiry = Date.now() + maxAge * 1000;

  return cachedCerts;
}

async function verifyFirebaseToken(token, projectId) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid login token");

  const header = JSON.parse(
    Buffer.from(parts[0], "base64url").toString("utf8")
  );

  const payload = JSON.parse(
    Buffer.from(parts[1], "base64url").toString("utf8")
  );

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Invalid token header");
  }

  const certs = await getFirebaseCerts();
  const cert = certs[header.kid];

  if (!cert) throw new Error("Unknown Firebase signing key");

  const validSignature = crypto.verify(
    "RSA-SHA256",
    Buffer.from(`${parts[0]}.${parts[1]}`),
    cert,
    Buffer.from(parts[2], "base64url")
  );

  const now = Math.floor(Date.now() / 1000);

  if (
    !validSignature ||
    payload.aud !== projectId ||
    payload.iss !== `https://securetoken.google.com/${projectId}` ||
    !payload.sub ||
    payload.sub.length > 128 ||
    !payload.exp ||
    payload.exp <= now ||
    !payload.iat ||
    payload.iat > now + 300 ||
    !payload.auth_time ||
    payload.auth_time > now + 300
  ) {
    throw new Error("Firebase login token is invalid or expired");
  }

  return payload;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;

    if (!projectId) {
      throw new Error("VITE_FIREBASE_PROJECT_ID is missing in Vercel");
    }

    const bearer = req.headers.authorization || "";

    if (!bearer.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Sign-in required" });
    }

    const decoded = await verifyFirebaseToken(
      bearer.slice(7),
      projectId
    );

    if (
      decoded.email_verified !== true ||
      decoded.email?.toLowerCase() !== "rajbabushaikh18@gmail.com"
    ) {
      return res.status(403).json({ error: "Verified admin access required" });
    }

    const { action, fileName, contentType, key: deleteKey } = req.body || {};

    const endpoint = process.env.R2_ENDPOINT;
    const bucket = process.env.R2_BUCKET;
    const publicBase = process.env.R2_PUBLIC_BASE_URL;

    if (
      !endpoint ||
      !bucket ||
      !process.env.R2_ACCESS_KEY_ID ||
      !process.env.R2_SECRET_ACCESS_KEY ||
      !publicBase
    ) {
      throw new Error("R2 environment variables are incomplete");
    }

    const client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      }
    });

    if (action === "delete") {
      if (typeof deleteKey !== "string" || !/^(?:umeed\/community\/|umeed\/umeed\/community\/|umeedcommunity\/)/.test(deleteKey) || deleteKey.includes("..") || deleteKey.length > 500) {
        return res.status(400).json({ error: "Invalid media key" });
      }
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: deleteKey }));
      return res.status(200).json({ deleted: true });
    }

    if (action && action !== "upload") return res.status(400).json({ error: "Invalid action" });
    if (!fileName || !allowedTypes.has(contentType)) {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    const ext = (fileName.split(".").pop() || "bin")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 8);

    // Always store new media in the same canonical folder as the working older images.
    const uploadPrefix = "umeed/umeed/community/";
    const key = `${uploadPrefix}${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType
    });

    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: 300
    });

    const publicOrigin = new URL(publicBase).origin;
    const publicUrl = new URL(key, `${publicOrigin}/`).toString();

    return res.status(200).json({
      uploadUrl,
      publicUrl,
      key
    });

  } catch (err) {
    console.error("R2 upload error:", err);
    return res.status(500).json({
      error: err.message || "Upload failed"
    });
  }
}
