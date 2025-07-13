import { Express } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAdminAuth(app: Express) {
  // Admin login route
  app.post("/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      console.log("Admin login attempt for:", username);
      
      const admin = await storage.getAdminByUsername(username);
      if (!admin || !admin.isActive) {
        console.log("Admin not found or inactive:", username);
        return res.status(401).json({ message: "帳號不存在或已停用" });
      }
      
      const isValid = await comparePasswords(password, admin.password);
      if (!isValid) {
        console.log("Invalid password for admin:", username);
        return res.status(401).json({ message: "密碼錯誤" });
      }

      // 設置管理員會話
      (req.session as any).adminId = admin.id;
      (req.session as any).isAdmin = true;
      
      // 更新最後登入時間
      await storage.updateAdminLastLogin(admin.id);
      
      console.log("Admin login successful:", username, "Session ID:", req.sessionID);
      res.json({ success: true, admin: { ...admin, isAdmin: true } });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "登入失敗" });
    }
  });

  // Admin logout route
  app.post("/admin/logout", (req, res) => {
    (req.session as any).adminId = null;
    (req.session as any).isAdmin = null;
    res.json({ success: true });
  });

  // Admin me route
  app.get("/admin/me", async (req, res) => {
    try {
      const adminId = (req.session as any)?.adminId;
      console.log("Admin me check - adminId:", adminId, "session:", req.sessionID);
      
      if (!adminId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const admin = await storage.getAdmin(adminId);
      if (!admin) {
        (req.session as any).adminId = null;
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      res.json({ ...admin, isAdmin: true });
    } catch (error) {
      console.error("Admin me error:", error);
      res.status(500).json({ message: "Failed to fetch admin info" });
    }
  });
}

// Admin middleware
export function requireAdmin(req: any, res: any, next: any) {
  const adminId = req.session?.adminId;
  if (!adminId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export async function createDefaultAdmin() {
  try {
    const existingAdmin = await storage.getAdminByUsername("admin");
    if (!existingAdmin) {
      const hashedPassword = await hashPassword("admin123456");
      await storage.createAdmin({
        username: "admin",
        password: hashedPassword,
        email: "admin@example.com",
        role: "super_admin",
        isActive: true,
      });
      console.log("Default admin created: admin/admin123456");
    }
  } catch (error) {
    console.error("Error creating default admin:", error);
  }
}