import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { createServer as createViteServer } from "vite";
import path from "path";

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "superrefreshsecret";

// Schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
});

// Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Auth Routes
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: "Email already in use" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name },
    });

    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    res.status(400).json({ error: "Invalid data" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Invalid credentials" });

    const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    res.status(400).json({ error: "Invalid data" });
  }
});

app.post("/api/auth/refresh", (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!refreshToken) return res.status(401).json({ error: "No refresh token" });

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
    const accessToken = jwt.sign({ userId: decoded.userId }, JWT_SECRET, { expiresIn: "15m" });
    res.json({ accessToken });
  } catch (err) {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out" });
});

// Task Routes
app.get("/api/tasks", authenticate, async (req: any, res: any) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { userId: req.userId };
    if (status) where.status = status;
    if (search) where.title = { contains: search };

    const tasks = await prisma.task.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.task.count({ where });

    res.json({ tasks, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/tasks", authenticate, async (req: any, res: any) => {
  try {
    const data = taskSchema.parse(req.body);
    const task = await prisma.task.create({
      data: { ...data, userId: req.userId },
    });
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: "Invalid data" });
  }
});

app.get("/api/tasks/:id", authenticate, async (req: any, res: any) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task || task.userId !== req.userId) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.patch("/api/tasks/:id", authenticate, async (req: any, res: any) => {
  try {
    const data = taskSchema.partial().parse(req.body);
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task || task.userId !== req.userId) return res.status(404).json({ error: "Task not found" });

    const updatedTask = await prisma.task.update({
      where: { id: req.params.id },
      data,
    });
    res.json(updatedTask);
  } catch (err) {
    res.status(400).json({ error: "Invalid data" });
  }
});

app.delete("/api/tasks/:id", authenticate, async (req: any, res: any) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task || task.userId !== req.userId) return res.status(404).json({ error: "Task not found" });

    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.patch("/api/tasks/:id/toggle", authenticate, async (req: any, res: any) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task || task.userId !== req.userId) return res.status(404).json({ error: "Task not found" });

    const newStatus = task.status === "DONE" ? "TODO" : "DONE";
    const updatedTask = await prisma.task.update({
      where: { id: req.params.id },
      data: { status: newStatus },
    });
    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
