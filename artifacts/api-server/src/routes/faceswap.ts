import { Router } from "express";
import { randomUUID } from "node:crypto";

const router = Router();

// ── Job store ─────────────────────────────────────────────────────
interface Job {
  status: "processing" | "done" | "error";
  result_url?: string;
  error?: string;
  createdAt: number;
  aiTaskId?: string; // aifaceswap.io task_id
}
const jobs = new Map<string, Job>();
// Map aifaceswap task_id → our jobId (for webhook lookup)
const aiTaskToJob = new Map<string, string>();

setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, j] of jobs) {
    if (j.createdAt < cutoff) {
      if (j.aiTaskId) aiTaskToJob.delete(j.aiTaskId);
      jobs.delete(id);
    }
  }
}, 10 * 60 * 1000);

function upd(jobId: string, data: Partial<Job>) {
  const j = jobs.get(jobId);
  if (j) jobs.set(jobId, { ...j, ...data });
}

// ── Ping ──────────────────────────────────────────────────────────
router.get("/face-swap/ping", (_req, res) => {
  res.json({ status: "ok" });
});

// ── Poll result ───────────────────────────────────────────────────
router.get("/face-swap/result/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  res.json(job);
});

// ── aifaceswap.io webhook receiver ───────────────────────────────
// aifaceswap calls this when the swap is done
router.post("/face-swap/webhook", (req, res) => {
  res.json({ received: true }); // Ack immediately
  const { task_id, image_url, status } = req.body as {
    task_id?: string;
    image_url?: string;
    status?: string | number;
  };
  req.log.info({ task_id, image_url, status }, "aifaceswap webhook received");
  if (!task_id) return;
  const jobId = aiTaskToJob.get(task_id);
  if (!jobId) return;
  if (image_url) {
    upd(jobId, { status: "done", result_url: image_url });
    aiTaskToJob.delete(task_id);
  } else {
    upd(jobId, { status: "error", error: "Swap failed. மீண்டும் try பண்ணுங்க." });
  }
});

// ── Start face swap job ───────────────────────────────────────────
router.post("/face-swap", async (req, res) => {
  const { source_url, target_url } = req.body as { source_url: string; target_url: string };
  if (!source_url || !target_url) {
    res.status(400).json({ error: "source_url and target_url required" });
    return;
  }
  const jobId = randomUUID();
  jobs.set(jobId, { status: "processing", createdAt: Date.now() });
  res.json({ jobId });
  processSwap(jobId, source_url, target_url).catch(() => {});
});

// ── Build webhook URL ─────────────────────────────────────────────
function webhookUrl(): string {
  // REPLIT_DOMAINS is comma-separated list of public domains
  const domain = (process.env["REPLIT_DOMAINS"] || "").split(",")[0].trim();
  if (domain) return `https://${domain}/api/face-swap/webhook`;
  // Dev fallback
  const dev = process.env["REPLIT_DEV_DOMAIN"] || "";
  if (dev) return `https://${dev}/api/face-swap/webhook`;
  return "";
}

// ── aifaceswap.io (~3 sec, 2 credits/swap) ───────────────────────
async function tryAiFaceSwap(
  jobId: string,
  srcUrl: string,   // target photo (whose body)
  faceUrl: string,  // selfie (face to put in)
): Promise<boolean> {
  const key = process.env["AIFACESWAP_KEY"];
  if (!key) return false;

  const wh = webhookUrl();
  const body: Record<string, string> = {
    source_image: srcUrl,   // body/target
    face_image:   faceUrl,  // face/selfie
  };
  if (wh) body["webhook"] = wh;

  const res = await fetch("https://aifaceswap.io/api/aifaceswap/v1/faceswap", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  const data = await res.json() as any;
  if (!res.ok || data?.code !== 200) {
    throw new Error(data?.message || `aifaceswap error ${res.status}`);
  }

  const aiTaskId: string = data?.data?.task_id;
  if (!aiTaskId) throw new Error("No task_id from aifaceswap");

  // Register for webhook lookup
  upd(jobId, { aiTaskId });
  aiTaskToJob.set(aiTaskId, jobId);

  if (!wh) {
    // No public webhook — poll manually after delay
    await fallbackPollAiFaceSwap(jobId, aiTaskId, key);
  }
  // If webhook is set, we just wait for the webhook to fire
  return true;
}

// Fallback polling when no public webhook is available
async function fallbackPollAiFaceSwap(jobId: string, aiTaskId: string, key: string) {
  // aifaceswap is ~3s — wait 8s then try to get result via re-submit trick
  // (no official GET poll, so we just wait and mark done if webhook doesn't arrive)
  await sleep(60000); // wait 60s for webhook to arrive
  const job = jobs.get(jobId);
  if (job?.status === "processing") {
    upd(jobId, {
      status: "error",
      error: "Swap done ஆகலை (webhook timeout). மீண்டும் try பண்ணுங்க.",
    });
  }
}

// ── fal.ai fallback ───────────────────────────────────────────────
async function tryFal(src: string, tgt: string): Promise<string | null> {
  const key = process.env["FAL_KEY"];
  if (!key) return null;
  const res = await fetch("https://fal.run/fal-ai/face-swap", {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ source_image_url: src, target_image_url: tgt }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) return null;
  const d = await res.json() as any;
  return d?.image?.url ?? d?.images?.[0]?.url ?? null;
}

// ── Direct Gradio HTTP (HuggingFace spaces) ───────────────────────
async function toDataUri(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const buf = await res.arrayBuffer();
  const mime = (res.headers.get("content-type") || "image/jpeg").split(";")[0];
  return `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
}

async function gradioPredict(slug: string, ep: string, data: unknown[]): Promise<string | null> {
  const res = await fetch(`https://${slug}.hf.space/run/${ep}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) throw new Error(`${slug} HTTP ${res.status}`);
  const json = await res.json() as any;
  const raw = json?.data?.[0];
  if (!raw) return null;
  if (typeof raw === "string" && (raw.startsWith("http") || raw.startsWith("data:"))) return raw;
  if (raw?.url) return raw.url as string;
  if (raw?.path) return `https://${slug}.hf.space/file=${raw.path}`;
  return null;
}

// ── Main processor ────────────────────────────────────────────────
async function processSwap(jobId: string, srcUrl: string, tgtUrl: string) {
  // 1. aifaceswap.io — fastest (~3 sec), webhook-based
  try {
    const started = await tryAiFaceSwap(jobId, tgtUrl, srcUrl);
    if (started) return; // webhook will update the job
  } catch { /* key missing or error — fall through to fal.ai */ }

  // 2. fal.ai — fast if credits available
  try {
    const url = await tryFal(srcUrl, tgtUrl);
    if (url) { upd(jobId, { status: "done", result_url: url }); return; }
  } catch { /* no credits */ }

  // 3. HuggingFace spaces (direct HTTP)
  let srcB64: string, tgtB64: string;
  try {
    [srcB64, tgtB64] = await Promise.all([toDataUri(srcUrl), toDataUri(tgtUrl)]);
  } catch (e: any) {
    upd(jobId, { status: "error", error: `Image load failed: ${e?.message}` });
    return;
  }

  const spaces = [
    { slug: "tonyassi-face-swap",    ep: "run_inference", data: [tgtB64, srcB64] },
    { slug: "felixrosberg-face-swap", ep: "predict",      data: [srcB64, tgtB64] },
  ];
  for (const s of spaces) {
    try {
      const url = await gradioPredict(s.slug, s.ep, s.data);
      if (url) { upd(jobId, { status: "done", result_url: url }); return; }
    } catch { continue; }
  }

  upd(jobId, {
    status: "error",
    error: "Face swap-க்கு API key இல்ல. aifaceswap.io-ல் sign up பண்ணி AIFACESWAP_KEY add பண்ணுங்க.",
  });
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export default router;
