import { Router } from "express";

const router = Router();

router.get("/app-config", (_req, res) => {
  // Gemini keys — slot 1 uses base key, slots 2-13 use GEMINI_API_KEY_2..13
  const baseGemini =
    process.env["GEMINI_API_KEY"] ||
    process.env["AI_INTEGRATIONS_GEMINI_API_KEY"] ||
    "";
  const geminiKeys: string[] = [];
  for (let i = 1; i <= 13; i++) {
    const slotKey = process.env[`GEMINI_API_KEY_${i}`] || "";
    geminiKeys.push(slotKey || (i === 1 ? baseGemini : ""));
  }
  // If slot 1 still empty but base key exists, fill it
  if (!geminiKeys[0] && baseGemini) geminiKeys[0] = baseGemini;

  res.json({
    githubToken: process.env["GITHUB_KEY"] || null,
    hfToken: process.env["HF_TOKEN"] || null,
    openrouterKey:
      process.env["AI_INTEGRATIONS_OPENROUTER_API_KEY"] ||
      process.env["OPENROUTER_API_KEY"] ||
      null,
    cloudinary: {
      cloudName:
        process.env["CLOUDNARY_USER_NAME"] ||
        process.env["CLOUDINARY_CLOUD_NAME"] ||
        null,
    },
    geminiKeys,
    defaultServerUrl: "https://my-dream-women.onrender.com",
  });
});

export default router;

