const express = require("express");
const { PrismaClient } = require("@prisma/client");
const auth = require("../middleware/auth");

const prisma = new PrismaClient();
const router = express.Router();

/* CREATE TASK */
router.post("/", auth, async (req, res) => {
  const { title, dueDate } = req.body;

  if (!title || !dueDate) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const task = await prisma.task.create({
    data: {
      title,
      dueDate: new Date(dueDate),
      userId: req.user.userId,
    },
  });

  res.json(task);
});

/* FETCH TASKS */
router.get("/", auth, async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { userId: req.user.userId },
  });

  const now = new Date();
  for (const task of tasks) {
    if (task.status !== "DONE" && task.dueDate < now) {
      await prisma.task.update({
        where: { id: task.id },
        data: { status: "BACKLOG" },
      });
    }
  }

  res.json(tasks);
});

/* UPDATE STATUS */
router.put("/:id/status", auth, async (req, res) => {
  const { status } = req.body;

  const task = await prisma.task.findUnique({
    where: { id: Number(req.params.id) },
  });

  if (!task || task.userId !== req.user.userId) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  if (task.status === "DONE") {
    return res.status(400).json({ error: "Task already DONE" });
  }

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: { status },
  });

  res.json(updated);
});

/* DELETE TASK */
router.delete("/:id", auth, async (req, res) => {
  const task = await prisma.task.findUnique({
    where: { id: Number(req.params.id) },
  });

  if (!task || task.userId !== req.user.userId) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  await prisma.task.delete({ where: { id: task.id } });

  res.json({ message: "Task deleted" });
});

module.exports = router;
