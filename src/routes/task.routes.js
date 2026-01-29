import express from "express";
import prisma from "../prismaclient.js"; // 🔥 FIXED spelling
import { auth, adminOnly } from "../middleware/auth.js";
import bcrypt from "bcryptjs";

const router = express.Router();

/* =========================
   LIST ALL USERS (ADMIN)
   ========================= */
router.get("/users", auth, adminOnly, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        verified: true,
      },
      orderBy: { id: "asc" },
    });

    res.json(users);
  } catch (err) {
    console.error("ADMIN USERS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

/* =========================
   UPDATE USER ROLE
   ========================= */
router.put("/users/:id/role", auth, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    const id = Number(req.params.id);

    if (!["ADMIN", "EMPLOYEE"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("UPDATE ROLE ERROR:", err);
    res.status(500).json({ error: "Failed to update role" });
  }
});

/* =========================
   DELETE USER
   ========================= */
router.delete("/users/:id", auth, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);

    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

/* =========================
   LIST ALL TASKS (ADMIN)
   ========================= */
router.get("/tasks", auth, adminOnly, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { id: "desc" },
    });

    res.json(tasks);
  } catch (err) {
    console.error("ADMIN TASKS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

/* =========================
   DELETE TASK (ADMIN)
   ========================= */
router.delete("/tasks/:id", auth, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);

    await prisma.task.delete({
      where: { id },
    });

    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    console.error("DELETE TASK ERROR:", err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

/* =========================
   SEED / ENSURE ADMIN
   ========================= */
router.post("/seed", async (req, res) => {
  try {
    const name = process.env.ADMIN_NAME || req.body.name || "Admin";
    const email = process.env.ADMIN_EMAIL || req.body.email;
    const password = process.env.ADMIN_PASSWORD || req.body.password;

    if (!email || !password) {
      return res.status(400).json({
        error: "ADMIN_EMAIL and ADMIN_PASSWORD required",
      });
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      if (existing.role !== "ADMIN") {
        await prisma.user.update({
          where: { id: existing.id },
          data: { role: "ADMIN", verified: true },
        });
      }
      return res.json({
        message: "Admin ensured",
        id: existing.id,
        email,
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const adminUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hash,
        role: "ADMIN",
        verified: true,
      },
    });

    res.json({
      message: "Admin created",
      id: adminUser.id,
      email,
    });
  } catch (err) {
    console.error("ADMIN SEED ERROR:", err);
    res.status(500).json({ error: "Failed to seed admin" });
  }
});

export default router;
