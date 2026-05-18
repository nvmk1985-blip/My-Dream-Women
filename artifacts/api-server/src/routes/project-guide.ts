import { Router } from "express";

const guideRouter = Router();

guideRouter.get("/guide", (_req, res) => {
  const html = `<!DOCTYPE html>
<html lang="ta">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>My AI Girls — Project Guide</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; color: #222; }
  .cover { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); color: white; padding: 60px 40px; text-align: center; min-height: 200px; }
  .cover h1 { font-size: 2.2em; margin-bottom: 10px; }
  .cover .sub { font-size: 1.1em; opacity: 0.8; margin-bottom: 20px; }
  .cover .badge { display: inline-block; background: #e94560; padding: 6px 18px; border-radius: 20px; font-size: 0.9em; }
  .container { max-width: 800px; margin: 0 auto; padding: 30px 20px; }
  h2 { color: #0f3460; border-left: 4px solid #e94560; padding-left: 12px; margin: 30px 0 15px; font-size: 1.3em; }
  h3 { color: #16213e; margin: 20px 0 8px; font-size: 1.05em; }
  p { line-height: 1.7; margin-bottom: 10px; color: #444; }
  .card { background: white; border-radius: 10px; padding: 20px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .step { display: flex; gap: 15px; align-items: flex-start; margin-bottom: 12px; }
  .step-num { background: #e94560; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85em; flex-shrink: 0; }
  .step-content { flex: 1; }
  code { background: #f0f0f0; padding: 2px 8px; border-radius: 4px; font-size: 0.9em; font-family: monospace; color: #c0392b; }
  .codeblock { background: #1a1a2e; color: #a8ff78; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 0.85em; margin: 10px 0; overflow-x: auto; line-height: 1.6; }
  .tag { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 0.8em; margin: 2px; }
  .tag-green { background: #e8f5e9; color: #2e7d32; }
  .tag-blue { background: #e3f2fd; color: #1565c0; }
  .tag-orange { background: #fff3e0; color: #e65100; }
  .url-box { background: #e8f5e9; border: 1px solid #a5d6a7; border-radius: 8px; padding: 12px 16px; font-family: monospace; font-size: 0.9em; color: #1b5e20; word-break: break-all; margin: 10px 0; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th { background: #0f3460; color: white; padding: 10px 12px; text-align: left; font-size: 0.9em; }
  td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 0.9em; }
  tr:nth-child(even) td { background: #f9f9f9; }
  .warn { background: #fff8e1; border-left: 4px solid #ffc107; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 10px 0; }
  .info { background: #e3f2fd; border-left: 4px solid #1565c0; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 10px 0; }
  .footer { text-align: center; padding: 30px; color: #999; font-size: 0.85em; border-top: 1px solid #eee; margin-top: 40px; }
  @media print {
    body { background: white; }
    .card { box-shadow: none; border: 1px solid #eee; }
    .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<div class="cover">
  <div style="font-size:3em;margin-bottom:15px">☁️</div>
  <h1>My AI Girls</h1>
  <div class="sub">Tamil AI Chat App — Project Guide</div>
  <div class="badge">📋 Version 1.0 — May 2025</div>
</div>

<div class="container">

  <!-- 1. Project Overview -->
  <h2>1. Project என்னன்னு?</h2>
  <div class="card">
    <p><strong>My AI Girls ☁️</strong> — Tamil AI chat app. Multiple AI characters (ப்ரியா, ஆர்யா, etc.) கிட்ட Tamil-ல் chat பண்ணலாம். Online-ல் Gemini AI, Offline-ல் Gemma AI use பண்றது.</p>
    <div style="margin-top:12px">
      <span class="tag tag-green">✅ Online — Gemini 2.5 Flash</span>
      <span class="tag tag-blue">🧠 Offline — Gemma 2B</span>
      <span class="tag tag-orange">📸 Cloud Photos — Cloudinary</span>
    </div>
  </div>

  <!-- 2. App URL -->
  <h2>2. App Link</h2>
  <div class="card">
    <h3>Development URL (Replit):</h3>
    <div class="url-box">https://4859336c-07a1-45b1-9dc0-4602b01f0494-00-2w6sxo3290q5j.expo.sisko.replit.dev</div>
    <div class="info" style="margin-top:10px">Edge browser-ல் திற → Menu (⋯) → Add to phone → Home screen-ல் app icon வரும்</div>
  </div>

  <!-- 3. Project Structure -->
  <h2>3. Project Files Structure</h2>
  <div class="card">
    <div class="codeblock">replit-my girles/
├── artifacts/
│   ├── tamil-ai-chat/          ← Mobile App (Expo/React Native Web)
│   │   ├── app/
│   │   │   ├── _layout.tsx     ← PIN Lock, App Shell
│   │   │   ├── home.tsx        ← Home screen, cover image
│   │   │   ├── ai-girls.tsx    ← Character list + Settings
│   │   │   ├── chat.tsx        ← Chat screen (main)
│   │   │   └── settings.tsx    ← App settings
│   │   ├── services/
│   │   │   ├── api.ts          ← Gemini API calls
│   │   │   └── webllm.ts       ← Gemma offline AI
│   │   ├── constants/
│   │   │   └── personas.ts     ← AI character definitions
│   │   └── app.json            ← App config, icon, splash
│   └── api-server/             ← Backend (Express.js)
│       └── src/
│           ├── app.ts          ← Express setup
│           └── routes/
│               ├── chat.ts     ← Gemini AI endpoint
│               └── cloudinary.ts ← Image upload
├── lib/                        ← Shared libraries
└── pnpm-workspace.yaml         ← Workspace config</div>
  </div>

  <!-- 4. Workflows -->
  <h2>4. App Workflows (எப்படி run ஆகுது)</h2>
  <div class="card">
    <table>
      <tr><th>Workflow</th><th>Command</th><th>Port</th></tr>
      <tr><td>📱 Expo App</td><td><code>pnpm --filter @workspace/tamil-ai-chat run dev</code></td><td>$PORT</td></tr>
      <tr><td>🖥️ API Server</td><td><code>pnpm --filter @workspace/api-server run dev</code></td><td>8080</td></tr>
    </table>
    <div class="warn" style="margin-top:12px">⚠️ Replit-ல் Workflows tab-ல் automatically run ஆகும். Manual-ஆ start பண்ண வேண்டாம்.</div>
  </div>

  <!-- 5. Key Features -->
  <h2>5. Features List</h2>
  <div class="card">
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-content"><strong>Multi Character Chat</strong> — ப்ரியா, ஆர்யா, லட்சுமி, etc. அவரவர் character-ஆ பேசுவாங்க</div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-content"><strong>Online AI (Gemini 2.5 Flash)</strong> — Best quality Tamil replies, API through Replit backend</div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-content"><strong>Offline AI (Gemma 2B)</strong> — Edge browser-ல் 1.4GB download, Internet இல்லாம chat</div>
    </div>
    <div class="step">
      <div class="step-num">4</div>
      <div class="step-content"><strong>Cloud Photo Gallery</strong> — Cloudinary-ல் character photos upload, ☁️ multi-select gallery</div>
    </div>
    <div class="step">
      <div class="step-num">5</div>
      <div class="step-content"><strong>Auto Message Timer</strong> — Character தானா 10/20/30 min-க்கு ஒரு முறை message அனுப்பும்</div>
    </div>
    <div class="step">
      <div class="step-num">6</div>
      <div class="step-content"><strong>PIN Lock</strong> — 4-digit PIN, app open பண்ண lock screen</div>
    </div>
    <div class="step">
      <div class="step-num">7</div>
      <div class="step-content"><strong>Home Cover Image</strong> — Gallery/Cloud-ல் இருந்து custom cover photo</div>
    </div>
  </div>

  <!-- 6. GitHub Upload Guide -->
  <h2>6. GitHub-ல் Project போட எப்படி?</h2>
  <div class="card">
    <h3>Step 1 — GitHub Account</h3>
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-content"><strong>github.com</strong> → Sign up (free) → New account create</div>
    </div>

    <h3 style="margin-top:15px">Step 2 — New Repository Create</h3>
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-content">GitHub → "+" → New repository → Name: <code>my-ai-girls</code></div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-content">Private repository select → Create repository</div>
    </div>

    <h3 style="margin-top:15px">Step 3 — Replit-ல் இருந்து GitHub connect</h3>
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-content">Replit → Version Control (🔀 icon) → Connect to GitHub</div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-content">Repository select → Push → Done! GitHub-ல் code போகும்</div>
    </div>

    <div class="info" style="margin-top:12px">💡 Replit automatically checkpoints save பண்றது — code loss-ஆகாது. GitHub backup additional safety மட்டும்.</div>
  </div>

  <!-- 7. How to View on GitHub -->
  <h2>7. GitHub-ல் Project பார்க்க</h2>
  <div class="card">
    <table>
      <tr><th>File/Folder</th><th>என்ன இருக்கு</th></tr>
      <tr><td><code>artifacts/tamil-ai-chat/app/</code></td><td>All screen files (chat, home, settings)</td></tr>
      <tr><td><code>artifacts/tamil-ai-chat/services/</code></td><td>AI service files (Gemini, Gemma)</td></tr>
      <tr><td><code>artifacts/tamil-ai-chat/constants/personas.ts</code></td><td>AI character definitions</td></tr>
      <tr><td><code>artifacts/api-server/src/routes/chat.ts</code></td><td>Gemini API backend</td></tr>
      <tr><td><code>artifacts/tamil-ai-chat/app.json</code></td><td>App name, icon, version</td></tr>
    </table>
  </div>

  <!-- 8. API Keys / Secrets -->
  <h2>8. Environment Variables (Secrets)</h2>
  <div class="card">
    <table>
      <tr><th>Variable</th><th>என்னத்துக்கு</th></tr>
      <tr><td><code>GEMINI_API_KEY</code></td><td>Google Gemini AI — ai.google.dev-ல் free key</td></tr>
      <tr><td><code>CLOUDINARY_API_SECRET</code></td><td>Photo cloud storage</td></tr>
      <tr><td><code>SESSION_SECRET</code></td><td>App security</td></tr>
    </table>
    <div class="warn" style="margin-top:10px">⚠️ இந்த keys-ஐ GitHub-ல் push பண்ணாதீங்க! Replit Secrets-ல் மட்டும் store பண்ணுங்க.</div>
  </div>

  <!-- 9. AsyncStorage Keys -->
  <h2>9. App Data (Phone Storage)</h2>
  <div class="card">
    <table>
      <tr><th>Key</th><th>என்ன save ஆகுது</th></tr>
      <tr><td><code>app_pin</code></td><td>4-digit PIN</td></tr>
      <tr><td><code>chat_is_online</code></td><td>Online/Offline mode</td></tr>
      <tr><td><code>auto_msg_enabled</code></td><td>Auto message on/off</td></tr>
      <tr><td><code>auto_msg_interval_[id]</code></td><td>Per character timer (10/20/30 min)</td></tr>
      <tr><td><code>home_cover_image</code></td><td>Home screen cover photo</td></tr>
      <tr><td><code>webllm_model_ready</code></td><td>Gemma download status (localStorage)</td></tr>
    </table>
  </div>

  <!-- 10. Troubleshooting -->
  <h2>10. Common Issues & Fixes</h2>
  <div class="card">
    <div class="step">
      <div class="step-num">❗</div>
      <div class="step-content"><strong>App loading spinner endless</strong> — Browser refresh பண்ணுங்க. AsyncStorage clear பண்ண வேண்டியிருக்கலாம்.</div>
    </div>
    <div class="step">
      <div class="step-num">❗</div>
      <div class="step-content"><strong>Gemma "பதில் இல்லை"</strong> — Engine loaded ஆனா empty reply. Simple prompt issue — page refresh try பண்ணுங்க.</div>
    </div>
    <div class="step">
      <div class="step-num">❗</div>
      <div class="step-content"><strong>Gemma re-downloading every time</strong> — Edge Memory Saver cache clear பண்றது. Edge → Settings → Performance → Memory Saver → Exception add.</div>
    </div>
    <div class="step">
      <div class="step-num">❗</div>
      <div class="step-content"><strong>Gemma Chrome-ல் error</strong> — shader-f16 not supported. Edge browser use பண்ணுங்க.</div>
    </div>
    <div class="step">
      <div class="step-num">❗</div>
      <div class="step-content"><strong>API Rate limit</strong> — Gemini free: 1500 req/day. Offline Gemma mode use பண்ணுங்க.</div>
    </div>
  </div>

</div>

<div class="footer">
  My AI Girls ☁️ — Built with Replit • Expo • Express • Gemini AI • WebLLM<br>
  <span style="color:#e94560">❤️</span> Made for Tamil AI Chat
</div>

<script>
  // Auto print dialog for PDF save
  window.addEventListener('load', () => {
    document.title = 'My AI Girls — Project Guide';
  });
</script>

</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export default guideRouter;
