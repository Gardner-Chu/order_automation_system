import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { startEmailListener } from "../emailListener";

// 全局错误处理器，防止服务器因未捕获的异常而崩溃
process.on('uncaughtException', (error: Error) => {
  console.error('[Server] Uncaught Exception:', error);
  // 不退出进程，让服务器继续运行
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
  // 不退出进程，让服务器继续运行
});

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = await findAvailablePort();
  server.listen(port, () => {
    console.log(`[${new Date().toLocaleTimeString()}] Server running on http://localhost:${port}/`);
  });
  
  // 启动邮件监听服务
  startEmailListener();
}

startServer().catch(console.error);
