import express from "express";
import prisma from "../prismaClient.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

/* GET TASKS */
router.get("/", auth, async (req, res) => {
  if (req.user.role === "ADMIN") {
    const tasks = await prisma.task.findMany({
      include: { user: true }
    });
    return res.json(tasks);
  }

  const tasks = await prisma.task.findMany({
    where: { userId: req.user.id }
  });
  res.json(tasks);
});

/* ADD TASK */
router.post("/", auth, async (req, res) => {
  const { title, dueDate } = req.body;

  let targetUserId = req.user.id;
  if (req.user.role === "ADMIN" && req.body.userId) {
    const u = await prisma.user.findUnique({
      where: { id: Number(req.body.userId) }
    });
    if (!u) return res.status(400).json({ error: "Invalid userId" });
    targetUserId = u.id;
  }

  const task = await prisma.task.create({
    data: { title, dueDate, userId: targetUserId }
  });

  res.json(task);
});

/* UPDATE TASK */
router.put("/:id", auth, async (req, res) => {
  const id = Number(req.params.id);

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Task not found" });

  if (req.user.role !== "ADMIN" && existing.userId !== req.user.id) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const task = await prisma.task.update({
    where: { id },
    data: req.body,
  });

  res.json(task);
});

/* DELETE TASK */
router.delete("/:id", auth, async (req, res) => {
  const id = Number(req.params.id);

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Task not found" });

  if (req.user.role !== "ADMIN" && existing.userId !== req.user.id) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  await prisma.task.delete({ where: { id } });
  res.json({ message: "Deleted" });
});

export default router;
