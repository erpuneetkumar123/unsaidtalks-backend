import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../prismaclient.js";

const router = express.Router();

/* REGISTER */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(400).json({ error: "Email already registered" });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hash }
    });
    const token = jwt.sign({ id: user.id }, "VERIFY_SECRET", { expiresIn: "2d" });
    const verifyUrl = `http://localhost:5000/api/auth/verify/${token}`;
    console.log("Verify your account:", verifyUrl);
    res.json({ message: "User registered successfully. Verification link logged on backend." });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

/* VERIFY EMAIL */
router.get("/verify/:token", async (req, res) => {
  const data = jwt.verify(req.params.token, "VERIFY_SECRET");

  await prisma.user.update({
    where: { id: data.id },
    data: { verified: true }
  });

  res.send("Email verified. You can login now.");
});

/* LOGIN */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(400).json({ message: "User not found" });

  // Optional verify check disabled to allow login immediately

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ message: "Wrong password" });

  const token = jwt.sign({ id: user.id, role: user.role }, "JWT_SECRET");

  res.json({ token, role: user.role });
});

export default router;
