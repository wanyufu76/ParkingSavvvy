import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { setupAdminAuth, requireAdmin, createDefaultAdmin } from "./adminAuth2";
import {
  insertParkingSpotSchema,
  insertUserFavoriteSchema,
  insertImageUploadSchema,
  insertContactMessageSchema,
  insertUserNotificationSchema,
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

/* --------------------------------------------------
 *  Multer – local uploads (images / videos up to 500 MB)
 * -------------------------------------------------- */
const storageMulter = multer.diskStorage({
  destination: (_, __, cb) => cb(null, "uploads/"),
  filename: (_, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    // 以 UTF‑8 正確保存檔名（解決中文亂碼）
    const original = Buffer.from(file.originalname, "latin1").toString("utf8");
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(original)}`);
  },
});

const upload = multer({
  storage: storageMulter,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowedExt = [".jpg", ".jpeg", ".png", ".mp4", ".avi", ".mov"];
    const allowedMime = [
      "image/jpeg",
      "image/png",
      "video/mp4",
      "video/avi",
      "video/quicktime"
    ];

    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;

    if (allowedExt.includes(ext) && allowedMime.includes(mime)) {
      cb(null, true);
    } else {
      cb(new Error("僅允許上傳圖片或影片（JPG/PNG/GIF/MP4/AVI/MOV）"));
    }
  },
});

/* --------------------------------------------------
 *  共用 middleware
 * -------------------------------------------------- */
const requireAuth = (req: any, res: any, next: any) => {
  console.log("Auth check – isAuthenticated:", req.isAuthenticated());
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
};

/* --------------------------------------------------
 *  主路由註冊
 * -------------------------------------------------- */
export async function registerRoutes(app: Express): Promise<Server> {
  /* ---------- 基本 auth ---------- */
  setupAuth(app);
  setupAdminAuth(app);
  await createDefaultAdmin();

  /* ---------- Google OAuth ---------- */
  app.get("/api/auth/google", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(500).send("Google OAuth not configured");

    const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code, error } = req.query;
      if (error) return res.redirect(`/?error=${encodeURIComponent(String(error))}`);
      if (!code) return res.redirect("/?error=missing_code");

      const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/google/callback`;
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          code: String(code),
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });
      const tokenJson = await tokenRes.json();
      if (!tokenJson.access_token) return res.redirect("/?error=token_failed");

      const userJson = await (await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      })).json();

      // 建立或取得使用者
      let user = await storage.getUserByEmail(userJson.email);
      if (!user) {
        user = await storage.createUser({
          username: userJson.email.split("@")[0],
          email: userJson.email,
          password: "oauth_user",
          firstName: userJson.given_name ?? "",
          lastName: userJson.family_name ?? "",
        });
      }

      (req as any).login(user, (err: any) => {
        if (err) return res.redirect("/?error=session_fail");
        res.redirect("/?login=success");
      });
    } catch (e) {
      console.error("Google OAuth error", e);
      res.status(500).send("OAuth failed");
    }
  });

  app.get("/api/auth/github", (req, res) => {
    // Redirect to GitHub OAuth
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/github/callback`;
    const scope = 'user:email';
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
    
    if (!clientId) {
      return res.status(500).json({ message: "GitHub OAuth not configured" });
    }
    
    res.redirect(githubAuthUrl);
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      console.log("Google OAuth callback received");
      console.log("Query params:", req.query);
      const { code, error, state } = req.query;
      
      if (error) {
        console.error("OAuth error:", error);
        return res.redirect(`/?error=${encodeURIComponent(error as string)}`);
      }
      
      if (!code) {
        console.error("Missing authorization code");
        console.error("Full query:", req.query);
        return res.redirect("/?error=missing_code");
      }

      console.log("Exchanging code for token...");
      const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
      
      // Exchange code for access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          code: code as string,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenResponse.json();
      console.log("Token response status:", tokenResponse.status);
      
      if (!tokenData.access_token) {
        console.error("Token error:", tokenData);
        return res.redirect("/?error=token_failed");
      }

      // Get user info from Google
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      const userData = await userResponse.json();
      
      // Create or find user in database
      console.log("Google user data:", userData);
      let user = await storage.getUserByEmail(userData.email);
      if (!user) {
        console.log("Creating new user from Google OAuth");
        user = await storage.createUser({
          username: userData.email.split('@')[0], // 使用email前綴作為用戶名
          email: userData.email,
          password: 'oauth_user', // OAuth users don't need password
          firstName: userData.given_name || '',
          lastName: userData.family_name || '',
        });
        console.log("New user created:", user.id);
      } else {
        console.log("Existing user found:", user.id);
      }

      // Log user in
      (req as any).login(user, (err: any) => {
        if (err) {
          console.error("Login session error:", err);
          return res.redirect("/?error=login_failed");
        }
        console.log("Google OAuth login successful for user:", user.email);
        res.redirect('/?login=success');
      });

    } catch (error) {
      console.error("Google OAuth error:", error);
      res.status(500).json({ message: "OAuth authentication failed" });
    }
  });

  app.get("/api/auth/github/callback", async (req, res) => {
    try {
      const { code } = req.query;
      if (!code) {
        return res.status(400).json({ message: "Missing authorization code" });
      }

      // Exchange code for access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID!,
          client_secret: process.env.GITHUB_CLIENT_SECRET!,
          code: code as string,
        }),
      });

      const tokenData = await tokenResponse.json();
      
      if (!tokenData.access_token) {
        return res.status(400).json({ message: "Failed to get access token" });
      }

      // Get user info from GitHub
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      const userData = await userResponse.json();
      
      // Get user email (might be private)
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });
      const emails = await emailResponse.json();
      const primaryEmail = emails.find((email: any) => email.primary)?.email || userData.email;

      // Create or find user in database
      let user = await storage.getUserByEmail(primaryEmail);
      if (!user) {
        user = await storage.createUser({
          username: userData.login,
          email: primaryEmail,
          password: 'oauth_user', // OAuth users don't need password
          firstName: userData.name?.split(' ')[0] || '',
          lastName: userData.name?.split(' ').slice(1).join(' ') || '',
        });
      }

      // Log user in
      (req as any).login(user, (err: any) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        res.redirect('/');
      });

    } catch (error) {
      console.error("GitHub OAuth error:", error);
      res.status(500).json({ message: "OAuth authentication failed" });
    }
  });

  // Parking spot routes
  app.get("/api/parking-spots", async (req, res) => {
    try {
      const spots = await storage.getAllParkingSpots();
      res.json(spots);
    } catch (error) {
      console.error("Error fetching parking spots:", error);
      res.status(500).json({ message: "Failed to fetch parking spots" });
    }
  });

  app.get("/api/parking-spots/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const spot = await storage.getParkingSpot(id);
      if (!spot) {
        return res.status(404).json({ message: "Parking spot not found" });
      }
      res.json(spot);
    } catch (error) {
      console.error("Error fetching parking spot:", error);
      res.status(500).json({ message: "Failed to fetch parking spot" });
    }
  });

  app.post("/api/parking-spots", requireAuth, async (req, res) => {
    try {
      const validatedData = insertParkingSpotSchema.parse(req.body);
      const spot = await storage.createParkingSpot(validatedData);
      res.status(201).json(spot);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating parking spot:", error);
      res.status(500).json({ message: "Failed to create parking spot" });
    }
  });

  app.patch("/api/parking-spots/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const spot = await storage.updateParkingSpot(id, req.body);
      res.json(spot);
    } catch (error) {
      console.error("Error updating parking spot:", error);
      res.status(500).json({ message: "Failed to update parking spot" });
    }
  });

  app.delete("/api/parking-spots/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteParkingSpot(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting parking spot:", error);
      res.status(500).json({ message: "Failed to delete parking spot" });
    }
  });

  // User favorites routes
  app.get("/api/favorites", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(400).json({ message: "User not found" });
      }
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post("/api/favorites", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(400).json({ message: "User not found" });
      }
      
      const validatedData = insertUserFavoriteSchema.parse({
        ...req.body,
        userId: userId,
      });
      
      const favorite = await storage.addUserFavorite(validatedData);
      res.status(201).json(favorite);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error adding favorite:", error);
      res.status(500).json({ message: "Failed to add favorite" });
    }
  });

  app.delete("/api/favorites/:parkingSpotId", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const parkingSpotId = parseInt(req.params.parkingSpotId);
      
      if (!userId) {
        return res.status(400).json({ message: "User not found" });
      }
      
      await storage.removeUserFavorite(userId, parkingSpotId);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  // Image upload routes
  app.post("/api/uploads", requireAuth, upload.single("file"), async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(400).json({ message: "User not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // 正確處理中文文件名編碼
      const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      
      const uploadData = {
        userId: userId,
        filename: req.file.filename,
        originalName: originalName,
        mimeType: req.file.mimetype,
        size: req.file.size,
        status: "uploaded" as const,
      };

      const validatedData = insertImageUploadSchema.parse(uploadData);
      const upload_record = await storage.createImageUpload(validatedData);
      res.status(201).json(upload_record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.get("/api/uploads", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(400).json({ message: "User not found" });
      }
      
      const uploads = await storage.getUserUploads(userId);
      res.json(uploads);
    } catch (error) {
      console.error("Error fetching uploads:", error);
      res.status(500).json({ message: "Failed to fetch uploads" });
    }
  });

  // 刪除使用者的影片上傳紀錄
  app.delete("/api/uploads/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      const id = parseInt(req.params.id);
      const upload = await storage.getImageUploadById(id);

      if (!upload || upload.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized or upload not found" });
      }

      // 刪除資料庫紀錄
      await storage.deleteImageUpload(id);

      // 刪除檔案
      const filePath = path.join(process.cwd(), "uploads", upload.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.status(200).json({ message: "刪除成功" });
    } catch (error) {
      console.error("Error deleting upload:", error);
      res.status(500).json({ message: "Failed to delete upload" });
    }
  });


    // 共享影片API - 只有有上傳記錄的用戶才能查看所有影片
    app.get("/api/shared-videos", requireAuth, async (req, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(400).json({ message: "User not found" });
        }
        
        // 先檢查用戶是否有上傳記錄
        const userUploads = await storage.getUserUploads(userId);
        if (userUploads.length === 0) {
          return res.status(403).json({ message: "需要有上傳記錄才能查看共享影片" });
        }
        
        // 獲取所有用戶的上傳檔案（包含用戶資訊）
        const allUploads = await storage.getAllUploadsWithUsers();
        res.json(allUploads);
      } catch (error) {
        console.error("Error fetching shared videos:", error);
        res.status(500).json({ message: "Failed to fetch shared videos" });
      }
    });

    // 影片檔案服務
    app.get("/api/uploads/:filename", requireAuth, async (req, res) => {
      try {
        const { filename } = req.params;
        const filePath = path.join(process.cwd(), "uploads", filename);
        
        // 檢查檔案是否存在
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ message: "File not found" });
        }
        
        // 設定正確的MIME type
        const ext = path.extname(filename).toLowerCase();
        let contentType = "application/octet-stream";
        
        if (ext === ".mp4") {
          contentType = "video/mp4";
        } else if (ext === ".jpg" || ext === ".jpeg") {
          contentType = "image/jpeg";
        } else if (ext === ".png") {
          contentType = "image/png";
        }
        
        res.set({
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${filename}"`,
          "Cache-Control": "public, max-age=31536000"
        });
        
        // 串流檔案
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
      } catch (error) {
        console.error("Error serving file:", error);
        res.status(500).json({ message: "Failed to serve file" });
      }
    });

    // Contact message route
    app.post("/api/contact", async (req, res) => {
      try {
        const validatedData = insertContactMessageSchema.parse(req.body);
        const message = await storage.createContactMessage(validatedData);
        res.status(201).json(message);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: "Invalid data", errors: error.errors });
        }
        console.error("Error creating contact message:", error);
        res.status(500).json({ message: "Failed to create contact message" });
      }
    });

  // Admin API routes
  app.get("/admin/api/messages", requireAdmin, async (req, res) => {
    try {
      const messages = await storage.getAllContactMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching contact messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/admin/api/messages/:id/reply", requireAdmin, async (req, res) => {
    try {
      const { reply } = req.body;
      const id = parseInt(req.params.id);
      const updatedMessage = await storage.updateContactMessage(id, reply);
      res.json(updatedMessage);
    } catch (error) {
      console.error("Error replying to message:", error);
      res.status(500).json({ message: "Failed to reply to message" });
    }
  });

  app.get("/admin/api/parking-spots", requireAdmin, async (req, res) => {
    try {
      const spots = await storage.getAllParkingSpots();
      res.json(spots);
    } catch (error) {
      console.error("Error fetching parking spots for admin:", error);
      res.status(500).json({ message: "Failed to fetch parking spots" });
    }
  });

  app.post("/admin/api/parking-spots", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertParkingSpotSchema.parse(req.body);
      const spot = await storage.createParkingSpot(validatedData);
      res.status(201).json(spot);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating parking spot:", error);
      res.status(500).json({ message: "Failed to create parking spot" });
    }
  });

  app.patch("/admin/api/parking-spots/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const spot = await storage.updateParkingSpot(id, req.body);
      res.json(spot);
    } catch (error) {
      console.error("Error updating parking spot:", error);
      res.status(500).json({ message: "Failed to update parking spot" });
    }
  });

  app.delete("/admin/api/parking-spots/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteParkingSpot(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting parking spot:", error);
      res.status(500).json({ message: "Failed to delete parking spot" });
    }
  });

  app.get("/admin/api/users", requireAdmin, async (req, res) => {
    try {
      // This would require a new storage method to get all users
      res.json([]);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // 管理員影片管理 - 查看所有上傳的影片
  app.get("/admin/api/videos", requireAdmin, async (req, res) => {
    try {
      const uploads = await storage.getAllUploadsWithUsers(); // 獲取所有用戶的上傳檔案，包含用戶資訊
      res.json(uploads);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  // 管理員刪除影片
  app.delete("/admin/api/videos/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteImageUpload(id);
      res.json({ message: "影片已刪除" });
    } catch (error) {
      console.error("Error deleting video:", error);
      res.status(500).json({ message: "Failed to delete video" });
    }
  });

  // 密碼修改API
  app.post("/api/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "新密碼確認不符" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "新密碼至少6位數" });
      }

      // 這裡需要驗證當前密碼，暫時簡化實現
      const { scrypt, randomBytes } = await import("crypto");
      const { promisify } = await import("util");
      const scryptAsync = promisify(scrypt);
      
      // 生成新密碼哈希
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(newPassword, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;
      
      await storage.updateUserPassword(req.user!.id, hashedPassword);
      res.json({ message: "密碼修改成功" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "密碼修改失敗" });
    }
  });

  // 管理員密碼修改API
  app.post("/admin/api/change-password", requireAdmin, async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "新密碼確認不符" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "新密碼至少6位數" });
      }

      const adminId = (req.session as any)?.adminId;
      if (!adminId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // 生成新密碼哈希
      const { scrypt, randomBytes } = await import("crypto");
      const { promisify } = await import("util");
      const scryptAsync = promisify(scrypt);
      
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(newPassword, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;
      
      await storage.updateAdminPassword(adminId, hashedPassword);
      res.json({ message: "密碼修改成功" });
    } catch (error) {
      console.error("Error changing admin password:", error);
      res.status(500).json({ message: "密碼修改失敗" });
    }
  });

  // 用戶通知API
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.user!.id);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      await storage.markNotificationAsRead(notificationId);
      res.json({ message: "通知已標記為已讀" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // 管理員回覆聯絡訊息時創建用戶通知
  app.post("/admin/api/messages/:id/reply-with-notification", requireAdmin, async (req, res) => {
    try {
      const { reply } = req.body;
      const id = parseInt(req.params.id);
      
      // 更新聯絡訊息
      const updatedMessage = await storage.updateContactMessage(id, reply);
      
      // 找到對應的用戶並創建通知（需要根據email查找用戶）
      const user = await storage.getUserByEmail(updatedMessage.email);
      if (user) {
        await storage.createUserNotification({
          userId: user.id,
          title: "系統回覆",
          message: `您的聯絡訊息「${updatedMessage.subject}」已收到回覆：${reply}`,
          type: "info"
        });
      }
      
      res.json(updatedMessage);
    } catch (error) {
      console.error("Error replying with notification:", error);
      res.status(500).json({ message: "Failed to reply with notification" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}