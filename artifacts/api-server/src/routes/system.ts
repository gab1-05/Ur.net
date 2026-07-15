import { Router } from "express";
import os from "os";
import dns from "dns/promises";
import { getCapabilities, detectRunMode } from "../lib/commands/adapter.js";

const router = Router();
const START_TIME = Date.now();

router.get("/system/info", async (req, res) => {
  const platform = os.platform();
  const mode = detectRunMode();

  let publicIp: string | null = null;
  try {
    const addrs = await dns.resolve4("myip.opendns.com");
    publicIp = addrs[0] ?? null;
  } catch { /* public IP lookup not critical */ }

  const localIps: string[] = [];
  const nets = os.networkInterfaces();
  for (const addrs of Object.values(nets)) {
    for (const addr of addrs ?? []) {
      if (addr.family === "IPv4" && !addr.internal) localIps.push(addr.address);
    }
  }

  res.json({
    hostname: os.hostname(),
    platform,
    os: `${os.type()} ${os.release()}`,
    arch: os.arch(),
    uptime: os.uptime(),
    nodeVersion: process.version,
    publicIp,
    localIps,
    demoMode: mode === "demo",
    environment: process.env.NODE_ENV ?? "development",
  });
});

router.get("/system/capabilities", async (req, res) => {
  const caps = await getCapabilities();
  res.json(caps);
});

export default router;
