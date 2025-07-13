import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import connectPg from "connect-pg-simple";

// ──────────────────────────────────────────────────────────────
// 型別宣告：把普通 User 欄位 + Admin 可能額外欄位都列為「可選」
// ──────────────────────────────────────────────────────────────
declare global {
  namespace Express {
    interface User extends SelectUser {
      /** 是否為管理員帳號 */
      isAdmin?: boolean;
      /** 角色名稱，例如 'admin' | 'super_admin' */
      role?: string;
      /** 帳號啟用狀態 */
      isActive?: boolean;
      /** 最近一次登入時間 */
      lastLogin?: Date | null;
    }
  }
}

// ──────────────────────────────────────────────────────────────
// 雜湊 / 驗證密碼函式
// ──────────────────────────────────────────────────────────────
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// ──────────────────────────────────────────────────────────────
// 管理員 Passport 與 Session 設定
// ──────────────────────────────────────────────────────────────
export function setupAdminAuth(app: Express): void {
  const PostgresSessionStore = connectPg(session);
  const isProd = process.env.NODE_ENV === "production";

  const adminSession: session.SessionOptions = {
    name: "admin.sid",
    secret: (process.env.SESSION_SECRET || "dev-secret") + "_admin",
    resave: false,
    saveUninitialized: false,
    store: new PostgresSessionStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      tableName: "sessions", // ❶ 與資料庫現有表一致
    }),
    cookie: {
      httpOnly: true,
      secure: isProd,       // 本機 http => false；正式 https => true
      sameSite: isProd ? "lax" : "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24h
    },
  };

  app.use(session(adminSession));
  app.use(passport.initialize());
  app.use(passport.session());

  // ───── Passport Strategy: admin 專用 ─────
  passport.use(
    "admin",
    new LocalStrategy(
      { usernameField: "username", passwordField: "password" },
      async (username, password, done) => {
        try {
          const admin = await storage.getAdminByUsername(username);
          if (!admin || !admin.isActive) {
            return done(null, false, { message: "帳號不存在或已停用" });
          }
          if (!(await comparePasswords(password, admin.password))) {
            return done(null, false, { message: "密碼錯誤" });
          }

          await storage.updateAdminLastLogin(admin.id);
          return done(null, { ...admin, isAdmin: true } as Express.User);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );

  // ───── 序列化 / 反序列化 ─────
  passport.serializeUser((user: Express.User, done) => {
    if (user.isAdmin) {
      done(null, `admin:${user.id}`);
    } else {
      done(null, user.id);
    }
  });

  passport.deserializeUser(async (id: string | number, done) => {
    try {
      if (typeof id === "string" && id.startsWith("admin:")) {
        const adminId = parseInt(id.slice(6), 10);
        const admin = await storage.getAdmin(adminId);
        if (admin) return done(null, { ...admin, isAdmin: true } as Express.User);
        return done(null, false);
      }
      // 非 admin：留給一般 auth.ts 處理
      return done(null, false);
    } catch (err) {
      return done(err);
    }
  });

  // ────────────────────────────────────
  //             Admin Routes            
  // ────────────────────────────────────
  app.post("/admin/login", passport.authenticate("admin"), (req, res) => {
    res.json({ success: true, admin: req.user });
  });

  app.post("/admin/logout", (req, res, next) => {
    req.logout(err => {
      if (err) return next(err);
      res.json({ success: true });
    });
  });

  app.get("/admin/me", (req, res) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(401).json({ error: "未登入或非管理員" });
    }
    const { password: _pw, ...admin } = req.user as Express.User & { password?: string };
    res.json(admin);
  });
}

// ──────────────────────────────────────────────────────────────
// 中介函式：僅允許 admin 存取
// ──────────────────────────────────────────────────────────────
export function requireAdmin(req: any, res: any, next: any): void {
  if (!req.isAuthenticated?.() || !req.user?.isAdmin) {
    return res.status(403).json({ error: "需要管理員權限" });
  }
  next();
}

// ──────────────────────────────────────────────────────────────
// 首次啟動自動建立預設管理員
// ──────────────────────────────────────────────────────────────
export async function createDefaultAdmin(): Promise<void> {
  try {
    const existing = await storage.getAdminByUsername("admin");
    if (existing) return;

    const hashed = await hashPassword("admin123456");
    await storage.createAdmin({
      username: "admin",
      password: hashed,
      email: "admin@parkingsystem.com",
      role: "super_admin",
      isActive: true,
    });
    console.log("Default admin created: admin / admin123456");
  } catch (err) {
    console.error("Error creating default admin:", err);
  }
}
