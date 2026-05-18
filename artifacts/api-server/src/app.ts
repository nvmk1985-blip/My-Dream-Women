import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.use("/api", router);

// Serve APK downloads — local public folder first, then redirect to GitHub Releases
app.get("/api/apk/:filename", async (req: Request, res: Response) => {
  const filename = String(req.params.filename ?? '');
  if (!filename.endsWith(".apk") || !/^[\w.\-]+$/.test(filename)) {
    res.status(400).json({ error: "Invalid filename" });
    return;
  }
  const localPath = path.join(__dirname, "../public", filename);
  const fs = require("fs") as typeof import("fs");
  if (fs.existsSync(localPath)) {
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.sendFile(localPath);
    return;
  }

  // Private repo — download via GitHub API with token and proxy to client
  const match = filename.match(/(v\d+)/);
  if (!match) { res.status(404).json({ error: "APK not found" }); return; }

  const tag = match[1];
  const ghToken = process.env["GITHUB_TOKEN"] ?? "";
  const repo = "nnvvmm663-sketch/my-girls-1";

  try {
    // 1. Look up the release asset id
    const relRes = await fetch(
      `https://api.github.com/repos/${repo}/releases/tags/${tag}`,
      { headers: { Authorization: `Bearer ${ghToken}`, Accept: "application/vnd.github+json" } },
    );
    if (!relRes.ok) { res.status(404).json({ error: `Release ${tag} not found` }); return; }
    const relJson = await relRes.json() as any;
    const asset = (relJson.assets as any[]).find((a: any) => a.name === filename);
    if (!asset) { res.status(404).json({ error: `${filename} not in release ${tag}` }); return; }

    // 2. Stream the asset bytes directly to the client
    const dlRes = await fetch(
      `https://api.github.com/repos/${repo}/releases/assets/${asset.id}`,
      { headers: { Authorization: `Bearer ${ghToken}`, Accept: "application/octet-stream" } },
    );
    if (!dlRes.ok || !dlRes.body) { res.status(502).json({ error: "GitHub download failed" }); return; }

    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    if (asset.size) res.setHeader("Content-Length", String(asset.size));

    const { Readable } = require("stream") as typeof import("stream");
    Readable.fromWeb(dlRes.body as any).pipe(res);
  } catch (e: any) {
    if (!res.headersSent) res.status(500).json({ error: e?.message ?? "Download error" });
  }
});

// Global error handler — catches any unhandled errors in routes so the process stays alive
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled route error");
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default app;
