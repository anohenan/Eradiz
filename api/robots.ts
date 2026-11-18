import type { IncomingMessage, ServerResponse } from "node:http";

type VercelRequest = IncomingMessage & {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

type VercelResponse = ServerResponse & {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  send: (body: string) => void;
};

function resolveBaseUrl(req: VercelRequest): string {
  const configured = process.env.APP_URL?.replace(/\/+$/, "");
  if (configured) return configured;

  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelUrl) {
    return vercelUrl.startsWith("http")
      ? vercelUrl.replace(/\/+$/, "")
      : `https://${vercelUrl.replace(/\/+$/, "")}`;
  }

  const hostHeader = req.headers["x-forwarded-host"] || req.headers.host;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  const protoHeader = req.headers["x-forwarded-proto"];
  const proto = Array.isArray(protoHeader)
    ? protoHeader[0]
    : protoHeader || "https";

  return `${proto}://${host || "localhost:3000"}`;
}

export default function handler(req: VercelRequest, res: VercelResponse): void {
  const baseUrl = resolveBaseUrl(req);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.status(200).send(
    [
      "User-agent: *",
      "Allow: /",
      "Disallow: /api/",
      `Sitemap: ${baseUrl}/sitemap.xml`,
    ].join("\n")
  );
}
