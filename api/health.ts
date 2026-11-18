import type { IncomingMessage, ServerResponse } from "node:http";

type VercelRequest = IncomingMessage & {
  method?: string;
};

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method && req.method !== "GET") {
    res.status(405).json({ error: "Méthode non autorisée." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const geminiConfigured = Boolean(apiKey && apiKey !== "MY_GEMINI_API_KEY");

  res.status(200).json({
    ok: true,
    service: "eradiz-api",
    runtime: "vercel",
    geminiConfigured,
  });
}
