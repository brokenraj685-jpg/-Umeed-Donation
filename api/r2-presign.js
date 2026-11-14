import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import crypto from "node:crypto";

const allowedTypes = new Set(["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm","video/quicktime"]);

function adminAuth() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing");
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return getAuth();
}

export default async function handler(req,res) {
  if (req.method !== "POST") return res.status(405).json({error:"Method not allowed"});
  try {
    const bearer = req.headers.authorization || "";
    if (!bearer.startsWith("Bearer ")) return res.status(401).json({error:"Sign-in required"});
    const decoded = await adminAuth().verifyIdToken(bearer.slice(7));
    if (decoded.admin !== true) return res.status(403).json({error:"Admin access required"});

    const {fileName,contentType} = req.body || {};
    if (!fileName || !allowedTypes.has(contentType)) return res.status(400).json({error:"Unsupported file type"});
    const endpoint=process.env.R2_ENDPOINT, bucket=process.env.R2_BUCKET, publicBase=process.env.R2_PUBLIC_BASE_URL;
    if (!endpoint || !bucket || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !publicBase) return res.status(500).json({error:"R2 environment variables are incomplete"});
    const client=new S3Client({region:"auto",endpoint,credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY}});
    const ext=(fileName.split(".").pop()||"bin").replace(/[^a-zA-Z0-9]/g,"").slice(0,8);
    const key=`community/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const command=new PutObjectCommand({Bucket:bucket,Key:key,ContentType:contentType});
    const uploadUrl=await getSignedUrl(client,command,{expiresIn:300});
    return res.status(200).json({uploadUrl,publicUrl:`${publicBase.replace(/\\/$/,"")}/${key}`});
  } catch (err) {
    return res.status(401).json({error:err.message || "Unauthorized"});
  }
}