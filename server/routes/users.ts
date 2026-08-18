import { Router } from "express";
import { requireSession, listUsers, createUser, deleteUser, getUserById, countAdmins } from "../db";

export const usersRouter = Router();

async function requireAdmin(req: any) {
  const session = await requireSession(req);
  if (!session || session.role !== "admin") return null;
  return session;
}

// List all accounts (admin only)
usersRouter.get("/", async (req, res) => {
  const admin = await requireAdmin(req);
  if (!admin) return res.status(403).json({ error: "Admin access required." });

  const users = await listUsers();
  res.json({ users });
});

// Create a new officer/admin account (admin only)
usersRouter.post("/", async (req, res) => {
  const admin = await requireAdmin(req);
  if (!admin) return res.status(403).json({ error: "Admin access required." });

  const { email, password, role } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  try {
    const user = await createUser(email, password, role === "admin" ? "admin" : "officer");
    res.json({ user });
  } catch (err: any) {
    if (String(err?.code) === "23505" || String(err?.message || "").includes("duplicate")) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }
    console.error("Error creating user:", err);
    res.status(500).json({ error: "Failed to create account." });
  }
});

// Delete an account (admin only)
usersRouter.delete("/:id", async (req, res) => {
  const admin = await requireAdmin(req);
  if (!admin) return res.status(403).json({ error: "Admin access required." });

  const target = await getUserById(req.params.id);
  if (!target) return res.status(404).json({ error: "User not found." });

  if (target.role === "admin") {
    const adminCount = await countAdmins();
    if (adminCount <= 1) {
      return res.status(400).json({ error: "Cannot delete the last remaining admin account." });
    }
  }

  await deleteUser(req.params.id);
  res.json({ ok: true });
});