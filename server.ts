import express from "express";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "node:path";
import aiHandler from "./server-api/ai";
import chatHandler from "./server-api/chat";
import healthHandler from "./server-api/health";
import waterSearchHandler from "./server-api/waters/search";
import waterDetailHandler from "./server-api/waters/[id]";
import dripperSearchHandler from "./server-api/drippers/search";
import grinderSearchHandler from "./server-api/grinders/search";
import brandSuggestionHandler from "./server-api/suggestions/brand";
import authMobileHandler from "./server-api/auth/mobile/[...route]";
import authUrlHandler from "./server-api/auth/url";
import authCallbackHandler from "./server-api/auth/callback";
import authEmailHandler from "./server-api/auth/email";
import authGuestHandler from "./server-api/auth/guest";
import authMeHandler from "./server-api/auth/me";
import authLogoutHandler from "./server-api/auth/logout";
import accountDeleteHandler from "./server-api/account/delete";
import accountExportHandler from "./server-api/account/export";
import accountStatusHandler from "./server-api/account/status";
import librarySyncHandler from "./server-api/library/sync";
import adminManagementHandler from "./server-api/admin/management";
import billingCheckoutHandler from "./server-api/billing/checkout";
import billingPortalHandler from "./server-api/billing/portal";
import billingSyncHandler from "./server-api/billing/sync";
import monitoringErrorHandler from "./server-api/monitoring/error";
import { handleTestAuthLogin, handleTestAuthLogout } from "./lib/test-auth/handlers";
import { buildLocalRuntimeAuthDefaults } from "./lib/test-auth/runtime-defaults";

dotenv.config({ path: ".env.local" });
dotenv.config();

const isLocalRuntime = !process.env.VERCEL;
const isProduction = process.env.NODE_ENV === "production";
Object.assign(process.env, buildLocalRuntimeAuthDefaults(process.env, { isLocalRuntime, isProduction }));

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);
const WEB_ROOT = path.resolve(process.cwd(), "apps/web");
const WEB_DIST = path.join(WEB_ROOT, "dist");

app.disable("x-powered-by");

// Keep local dev parity with attachment payload testing.
// Production still relies on client-side compression/size caps for serverless limits.
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb", parameterLimit: 200 }));
app.use(cookieParser());

type LocalApiHandler = (req: express.Request, res: express.Response) => void | Promise<void>;

function wrapVercelHandler(handler: LocalApiHandler) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };
}

function getBearerToken(req: express.Request): string {
  const authHeader = String(req.header("authorization") || "").trim();
  if (!authHeader) return "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function getContentSecurityPolicy() {
  if (!isProduction) {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "style-src-attr 'unsafe-inline'",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.googleusercontent.com",
      "connect-src 'self' ws: wss: http://localhost:* https://localhost:* https://*.googleapis.com https://*.google.com https://api.groq.com https://api.deepseek.com https://api.mistral.ai https://api.openai.com https://openrouter.ai https://*.firebaseio.com https://*.firebase.com wss://*.firebaseio.com",
      "frame-src https://accounts.google.com https://*.firebaseapp.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "manifest-src 'self'",
      "worker-src 'self'",
    ].join("; ");
  }

  return [
    "default-src 'self'",
    "script-src 'self' https://apis.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src-attr 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.googleusercontent.com",
    "connect-src 'self' https://*.googleapis.com https://*.google.com https://api.groq.com https://api.deepseek.com https://api.mistral.ai https://api.openai.com https://openrouter.ai https://*.firebaseio.com https://*.firebase.com wss://*.firebaseio.com",
    "frame-src https://accounts.google.com https://*.firebaseapp.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    "worker-src 'self'",
  ].join("; ");
}

function applySecurityHeaders(_req: express.Request, res: express.Response, next: express.NextFunction) {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(), interest-cohort=()");
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("Content-Security-Policy", getContentSecurityPolicy());
  next();
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ API routes (local dev mirror of Vercel serverless functions) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
app.use(applySecurityHeaders);
app.all("/api/health", wrapVercelHandler(healthHandler as unknown as LocalApiHandler));
app.all("/api/chat", wrapVercelHandler(chatHandler as unknown as LocalApiHandler));
app.all("/api/ai", wrapVercelHandler(aiHandler as unknown as LocalApiHandler));
app.all("/api/waters/search", wrapVercelHandler(waterSearchHandler as unknown as LocalApiHandler));
app.all("/api/waters/:id", (req, res, next) => {
  req.query.id = req.params.id;
  return wrapVercelHandler(waterDetailHandler as unknown as LocalApiHandler)(req, res, next);
});
app.all("/api/drippers/search", wrapVercelHandler(dripperSearchHandler as unknown as LocalApiHandler));
app.all("/api/grinders/search", wrapVercelHandler(grinderSearchHandler as unknown as LocalApiHandler));
app.all("/api/suggestions/brand", wrapVercelHandler(brandSuggestionHandler as unknown as LocalApiHandler));
app.all("/api/auth/mobile/start", wrapVercelHandler(authMobileHandler as unknown as LocalApiHandler));
app.all("/api/auth/mobile/callback", wrapVercelHandler(authMobileHandler as unknown as LocalApiHandler));
app.all("/api/auth/mobile/exchange", wrapVercelHandler(authMobileHandler as unknown as LocalApiHandler));
app.all("/api/auth/mobile/apple/exchange", wrapVercelHandler(authMobileHandler as unknown as LocalApiHandler));
app.all("/api/test-auth/login", (req, res) => handleTestAuthLogin(req as any, res as any));
app.all("/api/test-auth/logout", (req, res) => handleTestAuthLogout(req as any, res as any));
app.all("/api/auth/url", wrapVercelHandler(authUrlHandler as unknown as LocalApiHandler));
app.all("/api/auth/callback", wrapVercelHandler(authCallbackHandler as unknown as LocalApiHandler));
app.all("/api/auth/email/signin", wrapVercelHandler(authEmailHandler as unknown as LocalApiHandler));
app.all("/api/auth/email/signup", wrapVercelHandler(authEmailHandler as unknown as LocalApiHandler));
app.all("/api/auth/email/reset", wrapVercelHandler(authEmailHandler as unknown as LocalApiHandler));
app.all("/api/auth/email/update-password", wrapVercelHandler(authEmailHandler as unknown as LocalApiHandler));
app.all("/api/auth/guest", wrapVercelHandler(authGuestHandler as unknown as LocalApiHandler));

app.all("/api/auth/me", wrapVercelHandler(authMeHandler as unknown as LocalApiHandler));

app.all("/api/auth/logout", wrapVercelHandler(authLogoutHandler as unknown as LocalApiHandler));
app.all("/api/account/export", wrapVercelHandler(accountExportHandler as unknown as LocalApiHandler));
app.all("/api/account/delete", wrapVercelHandler(accountDeleteHandler as unknown as LocalApiHandler));
app.all("/api/account/status", wrapVercelHandler(accountStatusHandler as unknown as LocalApiHandler));
app.all("/api/library/sync", wrapVercelHandler(librarySyncHandler as unknown as LocalApiHandler));
app.all("/api/admin/management", wrapVercelHandler(adminManagementHandler as unknown as LocalApiHandler));
app.all("/api/billing/checkout", wrapVercelHandler(billingCheckoutHandler as unknown as LocalApiHandler));
app.all("/api/billing/portal", wrapVercelHandler(billingPortalHandler as unknown as LocalApiHandler));
app.all("/api/billing/sync", wrapVercelHandler(billingSyncHandler as unknown as LocalApiHandler));
app.all("/api/monitoring/error", wrapVercelHandler(monitoringErrorHandler as unknown as LocalApiHandler));

// Also handle /auth/callback as alias (for older redirect URIs)
app.get("/auth/callback", (req, res) => {
  // Redirect to the /api/ version
  const qs = new URLSearchParams(req.query as Record<string, string>).toString();
  res.redirect(`/api/auth/callback?${qs}`);
});

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Vite Middleware or Static Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[server] Unhandled local API error:", error);
  if (!res.headersSent) {
    res.status(500).json({ error: "Local server error" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      root: WEB_ROOT,
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(WEB_DIST));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(WEB_DIST, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();








