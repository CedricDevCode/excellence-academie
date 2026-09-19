// server/env.ts
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var candidatePaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, ".env"),
  path.resolve(__dirname, "..", ".env"),
  path.resolve(__dirname, "../..", ".env")
];
for (const envPath of candidatePaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}
dotenv.config();

// server/index.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit6 from "express-rate-limit";
import cookieParser from "cookie-parser";
import bcrypt3 from "bcrypt";

// server/utils/prisma.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
var databaseUrl = process.env.DATABASE_URL;
function isNeonHost(url) {
  const host = url.replace(/^[a-z]+:\/\/[^:@/]*:[^@]*@/, "").split("/")[0];
  return host.includes("-pooler.") && host.endsWith(".neon.tech");
}
function buildAdapter(dbUrl) {
  if (isNeonHost(dbUrl)) {
    const pool = new pg.Pool({ connectionString: dbUrl });
    return new PrismaPg(pool);
  }
  return new PrismaPg({ connectionString: dbUrl });
}
var adapter = databaseUrl ? buildAdapter(databaseUrl) : void 0;
var prisma = new PrismaClient(
  adapter ? { adapter } : void 0
);
var prisma_default = prisma;

// server/routes/userRoutes.ts
import { Router } from "express";
import multer from "multer";
import path2 from "path";
import fs2 from "fs";
import crypto from "crypto";
import { fileURLToPath as fileURLToPath2 } from "url";

// server/controllers/userController.ts
import bcrypt from "bcrypt";
var USER_SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  telephone: true,
  pays: true,
  ville: true,
  image: true,
  isActive: true,
  matricule: true,
  hourlyRate: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true
};
var getUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "50")));
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim();
    const role = req.query.role;
    const where = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { matricule: { contains: search, mode: "insensitive" } }
      ];
    }
    const [users, total] = await Promise.all([
      prisma_default.user.findMany({
        where,
        select: {
          ...USER_SAFE_SELECT,
          subscriptions: {
            select: {
              id: true,
              status: true,
              amount: true,
              nextPayment: true,
              course: { select: { id: true, title: true } }
            }
          },
          payments: {
            select: {
              id: true,
              amount: true,
              status: true,
              createdAt: true,
              course: { select: { id: true, title: true } }
            }
          },
          parentLinks: {
            select: {
              student: { select: { id: true, name: true, email: true, matricule: true } }
            }
          },
          studentLinks: {
            select: {
              parent: { select: { id: true, name: true, email: true } }
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma_default.user.count({ where })
    ]);
    res.json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration des utilisateurs" });
  }
};
var createUser = async (req, res) => {
  try {
    const { email, password, name, prenom, nom, role, telephone, ville, hourlyRate, studentIds } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: "Email, mot de passe et role sont requis" });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caracteres" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await prisma_default.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(400).json({ error: "Cet email est deja utilise" });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const fullName = name || [prenom, nom].filter(Boolean).join(" ").trim() || cleanEmail;
    const user = await prisma_default.user.create({
      data: {
        email: cleanEmail,
        password: hashedPassword,
        name: fullName,
        role: role || "TEACHER",
        telephone,
        ville,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null
      },
      select: USER_SAFE_SELECT
    });
    if (role === "PARENT" && Array.isArray(studentIds) && studentIds.length > 0) {
      await prisma_default.parentStudent.createMany({
        data: studentIds.map((sid) => ({ parentId: user.id, studentId: sid })),
        skipDuplicates: true
      });
    }
    res.status(201).json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Erreur lors de la creation de l'utilisateur" });
  }
};
var updateUser = async (req, res) => {
  try {
    const id = req.params.id;
    const { email, password, name, prenom, nom, role, telephone, pays, ville, isActive, image, hourlyRate, studentIds } = req.body;
    if (!id) {
      return res.status(400).json({ error: "ID utilisateur requis" });
    }
    const updateData = {};
    if (email !== void 0) updateData.email = email.trim().toLowerCase();
    if (role !== void 0) updateData.role = role;
    if (telephone !== void 0) updateData.telephone = telephone;
    if (pays !== void 0) updateData.pays = pays;
    if (ville !== void 0) updateData.ville = ville;
    if (isActive !== void 0) updateData.isActive = isActive;
    if (image !== void 0) updateData.image = image;
    if (hourlyRate !== void 0) updateData.hourlyRate = parseFloat(hourlyRate);
    if (name) {
      updateData.name = name;
    } else if (prenom || nom) {
      updateData.name = [prenom, nom].filter(Boolean).join(" ").trim();
    }
    if (password) {
      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caracteres" });
      }
      updateData.password = await bcrypt.hash(password, 12);
    }
    const user = await prisma_default.user.update({
      where: { id },
      data: updateData,
      select: USER_SAFE_SELECT
    });
    if (Array.isArray(studentIds)) {
      await prisma_default.parentStudent.deleteMany({ where: { parentId: id } });
      if (studentIds.length > 0) {
        await prisma_default.parentStudent.createMany({
          data: studentIds.map((sid) => ({ parentId: id, studentId: sid })),
          skipDuplicates: true
        });
      }
    }
    res.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Erreur lors de la mise a jour de l'utilisateur" });
  }
};
var updateMyProfile = async (req, res) => {
  try {
    const { name, telephone, ville, pays, image, password } = req.body;
    const updateData = {};
    if (name !== void 0) updateData.name = name;
    if (telephone !== void 0) updateData.telephone = telephone;
    if (ville !== void 0) updateData.ville = ville;
    if (pays !== void 0) updateData.pays = pays;
    if (image !== void 0) updateData.image = image;
    if (password) {
      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caract\xE8res" });
      }
      updateData.password = await bcrypt.hash(password, 12);
    }
    const user = await prisma_default.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        telephone: true,
        ville: true,
        pays: true,
        image: true,
        isActive: true
      }
    });
    res.json(user);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Erreur lors de la mise \xE0 jour du profil" });
  }
};
var deleteUser = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "ID utilisateur requis" });
    }
    if (id === req.user?.id) {
      return res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte." });
    }
    await prisma_default.$transaction([
      prisma_default.receipt.deleteMany({ where: { userId: id } }),
      prisma_default.payment.deleteMany({ where: { userId: id } }),
      prisma_default.subscription.deleteMany({ where: { userId: id } }),
      prisma_default.notification.deleteMany({ where: { userId: id } }),
      prisma_default.evaluation.deleteMany({ where: { studentId: id } }),
      prisma_default.evaluation.deleteMany({ where: { teacherId: id } }),
      prisma_default.user.delete({ where: { id } })
    ]);
    res.json({ message: "Utilisateur supprim\xE9 avec succ\xE8s" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Erreur lors de la suppression de l'utilisateur" });
  }
};

// server/middleware/authMiddleware.ts
import jwt from "jsonwebtoken";
var userCache = /* @__PURE__ */ new Map();
var CACHE_TTL_MS = 3e4;
var cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of userCache.entries()) {
    if (entry.expiresAt <= now) userCache.delete(key);
  }
}, 6e4);
if (cleanupInterval.unref) cleanupInterval.unref();
function invalidateUserCache(userId) {
  if (userId) {
    userCache.delete(userId);
  } else {
    userCache.clear();
  }
}
var authenticateToken = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: "Acc\xE8s refus\xE9. Authentification requise." });
  }
  try {
    const secret = process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);
    const now = Date.now();
    const cached = userCache.get(decoded.userId);
    if (cached && cached.expiresAt > now) {
      req.user = cached.data;
      return next();
    }
    const user = await prisma_default.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        matricule: true
      }
    });
    if (!user) {
      return res.status(401).json({ error: "Utilisateur introuvable ou supprim\xE9." });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: "Compte d\xE9sactiv\xE9. Contactez l'administration." });
    }
    userCache.set(decoded.userId, { data: user, expiresAt: now + CACHE_TTL_MS });
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Session expir\xE9e. Veuillez vous reconnecter." });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ error: "Token invalide." });
    }
    return res.status(500).json({ error: "Erreur d'authentification." });
  }
};
var requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Non authentifi\xE9." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Acc\xE8s refus\xE9 : permissions insuffisantes." });
    }
    next();
  };
};

// server/routes/userRoutes.ts
var __dirname2 = path2.dirname(fileURLToPath2(import.meta.url));
var userUploadsDir = path2.join(__dirname2, "..", "uploads", "users");
fs2.mkdirSync(userUploadsDir, { recursive: true });
var upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, userUploadsDir),
    filename: (_req, file, cb) => {
      const ext = path2.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Format invalide. Seules les images (JPEG, PNG, WebP, GIF) sont autoris\xE9es."));
    }
  }
});
var router = Router();
router.use(authenticateToken);
router.put("/me", updateMyProfile);
router.get("/", requireRole(["ADMIN"]), getUsers);
router.post("/", requireRole(["ADMIN"]), createUser);
router.put("/:id", requireRole(["ADMIN"]), updateUser);
router.delete("/:id", requireRole(["ADMIN"]), deleteUser);
var userRoutes_default = router;

// server/routes/paymentRoutes.ts
import { Router as Router2 } from "express";
import rateLimit from "express-rate-limit";

// server/constants.ts
var COUNTRY_TO_ISO2 = {
  "C\xF4te d'Ivoire": "CI",
  "France": "FR",
  "Belgique": "BE",
  "Canada": "CA",
  "S\xE9n\xE9gal": "SN",
  "Mali": "ML",
  "Burkina Faso": "BF",
  "B\xE9nin": "BJ",
  "Togo": "TG",
  "Cameroun": "CM",
  "Gabon": "GA",
  "Congo": "CG",
  "RDC": "CD",
  "Guin\xE9e": "GN",
  "Niger": "NE"
};
function isDiaspora(pays) {
  if (!pays) return false;
  const p = pays.trim().toLowerCase();
  return p !== "c\xF4te d'ivoire" && p !== "cote d'ivoire";
}
function isAbidjan(ville) {
  if (!ville) return false;
  return ville.trim().toLowerCase().startsWith("abidjan");
}
var COURS_PARTICULIERS_FEE = 2e5;
var DEFAULT_REGISTRATION_FEE = 45e3;
var DEFAULT_REGISTRATION_FEE_INTERIEUR = 35e3;
var DEFAULT_REGISTRATION_FEE_DIASPORA = 1e5;
var DEFAULT_MONTHLY_FEE = 3e4;
function courseRegistrationFee(course, pays, ville) {
  if (!course) return DEFAULT_REGISTRATION_FEE;
  if (pays && isDiaspora(pays)) {
    const diasFee = Number(course.registrationFeeDiaspora);
    if (diasFee > 0) return diasFee;
    return DEFAULT_REGISTRATION_FEE_DIASPORA;
  }
  if (ville && !isAbidjan(ville)) {
    const intFee = Number(course.registrationFeeInterieur);
    if (intFee > 0) return intFee;
    return DEFAULT_REGISTRATION_FEE_INTERIEUR;
  }
  const reg = Number(course.registrationFee);
  if (reg > 0) return reg;
  const price = Number(course.price);
  if (price > 0) return price;
  return DEFAULT_REGISTRATION_FEE;
}
function courseMonthlyFee(course, pays, mode) {
  if (!course) return DEFAULT_MONTHLY_FEE;
  if (pays && isDiaspora(pays)) {
    const diasFee = Number(course.monthlyFeeDiaspora);
    if (diasFee > 0) return diasFee;
    return 35e3;
  }
  if (mode === "en_ligne") {
    const onlineFee = Number(course.monthlyFeeOnline);
    if (onlineFee > 0) return onlineFee;
    return 25e3;
  }
  if (mode === "les_deux") {
    const bothFee = Number(course.monthlyFeeBoth);
    if (bothFee > 0) return bothFee;
    return 35e3;
  }
  const monthly = Number(course.monthlyFee);
  if (monthly > 0) return monthly;
  return DEFAULT_MONTHLY_FEE;
}
function calcRegistrationTotal(courses, coursParticuliers, pays, ville) {
  if (coursParticuliers) return COURS_PARTICULIERS_FEE;
  if (!Array.isArray(courses) || courses.length === 0) {
    if (pays && isDiaspora(pays)) return DEFAULT_REGISTRATION_FEE_DIASPORA;
    if (ville && !isAbidjan(ville)) return DEFAULT_REGISTRATION_FEE_INTERIEUR;
    return DEFAULT_REGISTRATION_FEE;
  }
  return courses.reduce((sum, c) => sum + courseRegistrationFee(c, pays, ville), 0);
}
function calcMonthlyTotal(courses, coursParticuliers, pays, mode) {
  if (coursParticuliers) return 0;
  if (!Array.isArray(courses) || courses.length === 0) return DEFAULT_MONTHLY_FEE;
  return courses.reduce((sum, c) => sum + courseMonthlyFee(c, pays, mode), 0);
}
var METHOD_TO_GP = {
  wave: "wave",
  orange: "orange_money",
  mtn: "mtn_money",
  moov: "moov_money",
  card: "card",
  WAVE: "wave",
  ORANGE_MONEY: "orange_money",
  MTN_MOMO: "mtn_money",
  MOOV: "moov_money",
  CARTE: "card"
};

// server/utils/geniuspay.ts
var GENIUSPAY_API_BASE = process.env.GENIUSPAY_API_BASE || "https://geniuspay.ci/api/v1/merchant";
var GENIUSPAY_API_KEY = process.env.GENIUSPAY_API_KEY || "";
var GENIUSPAY_SECRET_KEY = process.env.GENIUSPAY_SECRET_KEY || "";
var GENIUSPAY_ENVIRONMENT = process.env.GENIUSPAY_ENVIRONMENT || "sandbox";
var GENIUSPAY_WEBHOOK_SECRET = process.env.GENIUSPAY_WEBHOOK_SECRET || "";
var geniusPayHeaders = () => ({
  "X-API-Key": GENIUSPAY_API_KEY,
  "X-API-Secret": GENIUSPAY_SECRET_KEY,
  "Content-Type": "application/json",
  "Accept": "application/json"
});
async function handleGeniusPayResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    console.error(`GeniusPay error (${response.status}) body:`, text.slice(0, 500));
    return null;
  }
  const result = await response.json();
  if (!result.success) {
    console.error("GeniusPay API error:", JSON.stringify(result.error));
    return null;
  }
  return result.data;
}

// server/controllers/notificationController.ts
import nodemailer from "nodemailer";
import { EventEmitter } from "events";

// server/utils/push.ts
import webPush from "web-push";
var VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
var VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
var VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:contact@exacademie.net";
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}
function isPushEnabled() {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}
function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY;
}
async function savePushSubscription(userId, subscription, userAgent) {
  if (!isPushEnabled()) return;
  try {
    await prisma_default.pushSubscription.upsert({
      where: { userId_endpoint: { userId, endpoint: subscription.endpoint } },
      update: { p256dh: subscription.p256dh, auth: subscription.auth, userAgent },
      create: { userId, endpoint: subscription.endpoint, p256dh: subscription.p256dh, auth: subscription.auth, userAgent }
    });
  } catch (err) {
    console.error("Erreur sauvegarde push subscription:", err);
  }
}
async function removePushSubscription(endpoint) {
  if (!isPushEnabled()) return;
  try {
    await prisma_default.pushSubscription.deleteMany({ where: { endpoint } });
  } catch {
  }
}
async function sendPushNotification(userId, title, body, url, icon) {
  if (!isPushEnabled()) return;
  const subscriptions = await prisma_default.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return;
  const payload = JSON.stringify({
    title,
    body,
    icon: icon || "/images/logo exacademy.jpeg",
    badge: "/images/logo exacademy.jpeg",
    url: url || "/",
    timestamp: Date.now()
  });
  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma_default.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
        }
        throw err;
      }
    })
  );
  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) {
    console.warn(`Push notifications: ${failed}/${subscriptions.length} \xE9chou\xE9es pour userId ${userId}`);
  }
}

// server/controllers/notificationController.ts
var notificationEvents = new EventEmitter();
notificationEvents.setMaxListeners(100);
var streamNotifications = (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  res.write(`data: ${JSON.stringify({ type: "connected", time: Date.now() })}

`);
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const onNotification = (data) => {
    if (!data.userId || data.userId === userId || data.role && data.role === userRole) {
      res.write(`data: ${JSON.stringify({ type: "notification", ...data })}

`);
    }
  };
  notificationEvents.on("notification", onNotification);
  const heartbeat = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 25e3);
  req.on("close", () => {
    clearInterval(heartbeat);
    notificationEvents.off("notification", onNotification);
  });
};
var transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email",
  port: parseInt(process.env.SMTP_PORT || "587"),
  auth: {
    user: process.env.SMTP_USER || "ethereal.user@ethereal.email",
    pass: process.env.SMTP_PASS || "ethereal.pass"
  }
});
var sendDirectEmail = async (to, subject, html) => {
  try {
    const fromAddress = process.env.SMTP_FROM || "noreply@excellence-academie.ci";
    await transporter.sendMail({
      from: `"Excellence Acad\xE9mie" <${fromAddress}>`,
      to,
      subject,
      html
    });
  } catch (error) {
    console.error("Error sending direct email:", error);
  }
};
var getNotifications = async (req, res) => {
  try {
    const notifications = await prisma_default.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" }
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};
var markAsRead = async (req, res) => {
  try {
    const id = req.params.id;
    const notification = await prisma_default.notification.updateMany({
      where: { id, userId: req.user.id },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update notification" });
  }
};
var markAllAsRead = async (req, res) => {
  try {
    await prisma_default.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark all notifications as read" });
  }
};
var sendNotification = async (userId, title, message) => {
  try {
    const user = await prisma_default.user.findUnique({ where: { id: userId } });
    if (!user) return;
    const notif = await prisma_default.notification.create({
      data: {
        userId,
        title,
        message
      }
    });
    notificationEvents.emit("notification", {
      id: notif.id,
      userId,
      title,
      message,
      createdAt: notif.createdAt
    });
    sendPushNotification(userId, title, message).catch(() => {
    });
    const fromAddress = process.env.SMTP_FROM || "noreply@excellence-academie.ci";
    const escapeHtml = (str) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    await transporter.sendMail({
      from: `"Excellence Acad\xE9mie" <${fromAddress}>`,
      to: user.email,
      subject: title,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #f4f7f6;">
          <h2 style="color: #c97e00;">${escapeHtml(title)}</h2>
          <p>${escapeHtml(message)}</p>
          <hr />
          <p style="font-size: 12px; color: #888;">Ceci est un message automatique, merci de ne pas y r\xE9pondre.</p>
        </div>
      `
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};
var sendNotificationToRole = async (role, title, message) => {
  try {
    const users = await prisma_default.user.findMany({
      where: { role, isActive: true },
      select: { id: true }
    });
    for (const u of users) {
      await sendNotification(u.id, title, message);
    }
  } catch (err) {
    console.error(`Error sending notification to role ${role}:`, err);
  }
};
var sendBulkNotification = async (req, res) => {
  try {
    const { userIds, title, message } = req.body;
    if (!userIds || !Array.isArray(userIds) || !title || !message) {
      return res.status(400).json({ error: "Param\xE8tres manquants ou invalides" });
    }
    for (const userId of userIds) {
      await sendNotification(userId, title, message);
    }
    res.json({ success: true, count: userIds.length });
  } catch (error) {
    console.error("Error sending bulk notifications:", error);
    res.status(500).json({ error: "Erreur lors de l'envoi des notifications group\xE9es" });
  }
};

// server/controllers/paymentController.ts
var getMyPayments = async (req, res) => {
  try {
    const payments = await prisma_default.payment.findMany({
      where: { userId: req.user.id },
      include: {
        course: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    const firstPaymentPerCourse = {};
    for (let i = payments.length - 1; i >= 0; i--) {
      const key = payments[i].courseId || "unknown";
      if (!firstPaymentPerCourse[key]) {
        firstPaymentPerCourse[key] = payments[i].id;
      }
    }
    const enriched = payments.map((p) => ({
      ...p,
      type: p.id === firstPaymentPerCourse[p.courseId || "unknown"] ? "INSCRIPTION" : "MENSUALITE"
    }));
    res.json(enriched);
  } catch (error) {
    console.error("Error fetching my payments:", error);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
};
var getPayments = async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    const where = {};
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
    const payments = await prisma_default.payment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, ville: true } },
        course: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: "asc" }
    });
    const userIds = [...new Set(payments.map((p) => p.userId))];
    const courseIds = [...new Set(payments.map((p) => p.courseId).filter(Boolean))];
    const subs = await prisma_default.subscription.findMany({
      where: { userId: { in: userIds }, courseId: { in: courseIds } },
      select: { userId: true, courseId: true, formule: true, coursParticuliers: true }
    });
    const subMap = /* @__PURE__ */ new Map();
    for (const s of subs) subMap.set(`${s.userId}-${s.courseId}`, s);
    const firstPaymentPerPair = {};
    for (const p of payments) {
      const key = `${p.userId}-${p.courseId || "unknown"}`;
      if (!firstPaymentPerPair[key]) {
        firstPaymentPerPair[key] = p.id;
      }
    }
    const enriched = payments.map((p) => {
      const sub = subMap.get(`${p.userId}-${p.courseId || ""}`);
      return {
        ...p,
        type: p.id === firstPaymentPerPair[`${p.userId}-${p.courseId || "unknown"}`] ? "INSCRIPTION" : "MENSUALITE",
        formule: sub?.formule || null,
        coursParticuliers: sub?.coursParticuliers || false
      };
    }).reverse();
    res.json(enriched);
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
};
var initializePayment = async (req, res) => {
  try {
    const { amount, userId, courseId, paymentMethod } = req.body;
    const payment = await prisma_default.payment.create({
      data: { amount, userId, courseId, status: "PENDING" }
    });
    const user = await prisma_default.user.findUnique({ where: { id: userId } });
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const geniusPayBody = {
      amount,
      description: `Paiement inscription - ${user?.name || payment.id}`,
      customer: {
        name: user?.name || "",
        phone: user?.telephone || "",
        email: user?.email || ""
      },
      metadata: { payment_id: payment.id, user_id: userId, course_id: courseId },
      success_url: `${baseUrl}/payment/success`,
      error_url: `${baseUrl}/payment/error`
    };
    if (paymentMethod && METHOD_TO_GP[paymentMethod]) {
      geniusPayBody.payment_method = METHOD_TO_GP[paymentMethod];
    }
    const response = await fetch(`${GENIUSPAY_API_BASE}/payments`, {
      method: "POST",
      headers: geniusPayHeaders(),
      body: JSON.stringify(geniusPayBody),
      signal: AbortSignal.timeout(15e3)
    });
    const gpData = await handleGeniusPayResponse(response);
    if (!gpData) {
      return res.status(502).json({
        error: "Le service de paiement est temporairement indisponible. Veuillez r\xE9essayer ou contacter l'administrateur."
      });
    }
    await prisma_default.payment.update({
      where: { id: payment.id },
      data: { geniusPayReference: gpData.reference }
    });
    res.status(200).json({
      success: true,
      checkoutUrl: paymentMethod && METHOD_TO_GP[paymentMethod] ? gpData.payment_url || gpData.checkout_url : gpData.checkout_url || gpData.payment_url,
      reference: gpData.reference,
      paymentId: payment.id
    });
  } catch (error) {
    console.error("Error initializing payment:", error);
    res.status(500).json({ error: "Failed to initialize payment" });
  }
};
var verifyPayment = async (req, res) => {
  try {
    const { paymentId, reference } = req.body;
    const response = await fetch(`${GENIUSPAY_API_BASE}/payments/${reference}`, {
      headers: geniusPayHeaders(),
      signal: AbortSignal.timeout(15e3)
    });
    const gpData = await handleGeniusPayResponse(response);
    if (!gpData) {
      return res.status(404).json({ error: "Transaction introuvable" });
    }
    const isSuccess = gpData.status === "completed" || gpData.status === "success";
    await prisma_default.payment.update({
      where: { id: paymentId },
      data: { status: isSuccess ? "SUCCESS" : "FAILED" }
    });
    if (isSuccess) {
      try {
        const p = await prisma_default.payment.findUnique({
          where: { id: paymentId },
          include: { user: true }
        });
        if (p?.user) {
          await sendNotification(p.userId, "Paiement valid\xE9", `Votre versement de ${Number(p.amount).toLocaleString("fr-FR")} FCFA a \xE9t\xE9 valid\xE9 avec succ\xE8s.`);
          await sendNotificationToRole("ADMIN", "Nouveau paiement re\xE7u", `Paiement de ${Number(p.amount).toLocaleString("fr-FR")} FCFA re\xE7u de l'\xE9tudiant(e) ${p.user.name}.`);
          await sendNotificationToRole("ACCOUNTANT", "Paiement comptabilis\xE9", `R\xE8glement de ${Number(p.amount).toLocaleString("fr-FR")} FCFA re\xE7u de ${p.user.name}.`);
        }
      } catch (err) {
        console.error("Notification error on payment verification:", err);
      }
      res.status(200).json({ success: true, message: "Payment verified" });
    } else {
      res.status(400).json({ success: false, message: "Payment failed" });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ error: "Failed to verify payment" });
  }
};

// server/controllers/geniusPayController.ts
import crypto2 from "crypto";

// server/utils/generators.ts
function generateReceiptNumber() {
  const now = /* @__PURE__ */ new Date();
  const y = now.getFullYear().toString();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `REC-${y}${m}${d}-${rand}`;
}
async function generateMatricule() {
  const year = (/* @__PURE__ */ new Date()).getFullYear().toString();
  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const last2 = await prisma_default.user.findFirst({
      where: { matricule: { startsWith: `EA-${year}-` } },
      orderBy: { matricule: "desc" },
      select: { matricule: true }
    });
    let next2 = 1;
    if (last2?.matricule) {
      const parts = last2.matricule.split("-");
      next2 = parseInt(parts[2], 10) + 1 + attempt;
    }
    const matricule = `EA-${year}-${String(next2).padStart(4, "0")}`;
    try {
      await prisma_default.user.findFirst({ where: { matricule }, select: { id: true } });
      return matricule;
    } catch {
      continue;
    }
  }
  const last = await prisma_default.user.findFirst({
    where: { matricule: { startsWith: `EA-${year}-` } },
    orderBy: { matricule: "desc" },
    select: { matricule: true }
  });
  let next = 1;
  if (last?.matricule) {
    const parts = last.matricule.split("-");
    next = parseInt(parts[2], 10) + 1;
  }
  return `EA-${year}-${String(next).padStart(4, "0")}`;
}

// server/controllers/geniusPayController.ts
var initPayment = async (req, res) => {
  try {
    const { userId, courseId, formule, successUrl, errorUrl, paymentMethod, pays, ville, mode, coursParticuliers } = req.body;
    if (!userId || !courseId || !formule) {
      return res.status(400).json({ error: "userId, courseId et formule sont requis" });
    }
    const user = await prisma_default.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, telephone: true, pays: true, ville: true }
    });
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }
    const isCoursParticuliers = coursParticuliers || false;
    const course = await prisma_default.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({ error: "Formation introuvable" });
    }
    const amount = calcRegistrationTotal([course], isCoursParticuliers);
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const geniusPayBody = {
      amount,
      description: `Inscription: ${user.name} - ${course.title} (${formule})`,
      customer: {
        name: user.name || "",
        phone: user.telephone || "",
        email: user.email || ""
      },
      metadata: {
        user_id: userId,
        course_id: courseId,
        formule
        // Pas de données sensibles dans les métadonnées
      },
      success_url: successUrl || `${baseUrl}/payment/success`,
      error_url: errorUrl || `${baseUrl}/payment/error`
    };
    if (paymentMethod && METHOD_TO_GP[paymentMethod]) {
      geniusPayBody.payment_method = METHOD_TO_GP[paymentMethod];
    }
    const response = await fetch(`${GENIUSPAY_API_BASE}/payments`, {
      method: "POST",
      headers: geniusPayHeaders(),
      body: JSON.stringify(geniusPayBody),
      signal: AbortSignal.timeout(15e3)
    });
    const gpData = await handleGeniusPayResponse(response);
    if (!gpData) {
      return res.status(502).json({
        error: "Le service de paiement est temporairement indisponible. Veuillez r\xE9essayer."
      });
    }
    const payment = await prisma_default.payment.create({
      data: {
        amount,
        userId,
        courseId,
        status: "PENDING",
        geniusPayReference: gpData.reference
      }
    });
    const nextPayment = /* @__PURE__ */ new Date();
    nextPayment.setMonth(nextPayment.getMonth() + 1);
    await prisma_default.subscription.create({
      data: { userId, courseId, amount, status: "PENDING", nextPayment }
    });
    res.status(200).json({
      success: true,
      checkoutUrl: paymentMethod && METHOD_TO_GP[paymentMethod] ? gpData.payment_url || gpData.checkout_url : gpData.checkout_url || gpData.payment_url,
      reference: gpData.reference,
      paymentId: payment.id,
      environment: gpData.environment
    });
  } catch (error) {
    console.error("GeniusPay init error:", error);
    res.status(500).json({ error: "Erreur lors de l'initialisation du paiement" });
  }
};
var checkPaymentStatus = async (req, res) => {
  try {
    const reference = req.params.reference;
    if (!reference) {
      return res.status(400).json({ error: "R\xE9f\xE9rence requise" });
    }
    const response = await fetch(`${GENIUSPAY_API_BASE}/payments/${reference}`, {
      headers: geniusPayHeaders(),
      signal: AbortSignal.timeout(15e3)
    });
    const gpData = await handleGeniusPayResponse(response);
    if (!gpData) {
      return res.status(404).json({ error: "Transaction introuvable" });
    }
    if (gpData.status === "completed" || gpData.status === "success") {
      await prisma_default.payment.updateMany({
        where: { geniusPayReference: reference },
        data: { status: "SUCCESS" }
      });
      await prisma_default.subscription.updateMany({
        where: { userId: gpData.metadata?.user_id, courseId: gpData.metadata?.course_id },
        data: { status: "ACTIVE" }
      });
      if (gpData.metadata?.user_id) {
        await prisma_default.user.update({
          where: { id: gpData.metadata.user_id },
          data: { isActive: true }
        });
      }
    } else if (["failed", "cancelled", "expired"].includes(gpData.status)) {
      await prisma_default.payment.updateMany({
        where: { geniusPayReference: reference },
        data: { status: "FAILED" }
      });
      await prisma_default.subscription.updateMany({
        where: { userId: gpData.metadata?.user_id, courseId: gpData.metadata?.course_id },
        data: { status: "CANCELLED" }
      });
    }
    res.json({
      success: true,
      status: gpData.status,
      reference: gpData.reference,
      amount: gpData.amount,
      fees: gpData.fees,
      netAmount: gpData.net_amount,
      paymentMethod: gpData.payment_method,
      environment: gpData.environment
      // Ne pas exposer customer et metadata (données personnelles)
    });
  } catch (error) {
    console.error("GeniusPay status check error:", error);
    res.status(500).json({ error: "Erreur de v\xE9rification du statut" });
  }
};
var handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];
    const event = req.headers["x-webhook-event"];
    const rawBody = req.rawBody;
    if (!GENIUSPAY_WEBHOOK_SECRET) {
      if (GENIUSPAY_ENVIRONMENT !== "sandbox") {
        console.error("[Webhook] GENIUSPAY_WEBHOOK_SECRET non configur\xE9. Webhook rejet\xE9 en production.");
        return res.status(401).json({ error: "Configuration webhook manquante" });
      }
      console.warn("[Webhook] Mode sandbox : v\xE9rification de signature d\xE9sactiv\xE9e");
    } else {
      if (!signature || !timestamp || !rawBody) {
        console.warn("[Webhook] Signature, timestamp ou corps brut manquant. Rejet\xE9.");
        return res.status(401).json({ error: "Donn\xE9es de signature manquantes" });
      }
      const data = `${timestamp}.${rawBody}`;
      const expectedSignature = crypto2.createHmac("sha256", GENIUSPAY_WEBHOOK_SECRET).update(data).digest("hex");
      if (expectedSignature.length !== signature.length || !crypto2.timingSafeEqual(Buffer.from(expectedSignature, "hex"), Buffer.from(signature, "hex"))) {
        console.warn("[Webhook] Signature invalide. Rejet\xE9.");
        return res.status(401).json({ error: "Signature invalide" });
      }
      const now = Math.floor(Date.now() / 1e3);
      const ts = parseInt(timestamp, 10);
      if (!ts || Math.abs(now - ts) > 300) {
        console.warn("[Webhook] Timestamp trop ancien ou invalide. Rejet\xE9.");
        return res.status(400).json({ error: "Timestamp expir\xE9" });
      }
    }
    const payload = req.body;
    if (event === "payment.success" || payload.event === "payment.success") {
      const data = payload.data || payload;
      const reference = data.reference;
      const metadata = data.metadata || {};
      if (metadata.action === "shop_order") {
        const orderId = metadata.order_id;
        if (orderId) {
          const order = await prisma_default.shopOrder.update({
            where: { id: orderId },
            data: { status: "PAID" }
          });
          try {
            await sendDirectEmail(
              order.customerEmail,
              `Confirmation de paiement - Excellence Acad\xE9mie`,
              `<p>Bonjour ${order.customerName},</p>
               <p>Nous avons bien re\xE7u le paiement de ${order.totalAmount} FCFA pour votre commande (Ref: ${order.id}).</p>
               <p>Nous la traiterons dans les plus brefs d\xE9lais.</p>
               <p>Merci de votre confiance !</p>
               <p>L'\xE9quipe Excellence Acad\xE9mie</p>`
            );
          } catch (err) {
            console.error("[Webhook] Erreur envoi email commande boutique:", err);
          }
          console.log(`[Webhook] Commande boutique pay\xE9e : ${orderId}`);
        }
      } else if (metadata.action === "add_course" && metadata.user_id && metadata.course_ids) {
        const userId = metadata.user_id;
        const courseIdList = String(metadata.course_ids).split(",").filter(Boolean);
        const monthlyAmt = Number(metadata.monthly_amount) || 0;
        const existingPayment = await prisma_default.payment.findFirst({
          where: { geniusPayReference: reference }
        });
        if (!existingPayment) {
          const payment = await prisma_default.payment.create({
            data: { amount: data.amount || 0, userId, status: "SUCCESS", geniusPayReference: reference }
          });
          const receiptNumber = generateReceiptNumber();
          await prisma_default.payment.update({ where: { id: payment.id }, data: { receiptNumber } });
        }
        const user = await prisma_default.user.findUnique({ where: { id: userId } });
        for (const cId of courseIdList) {
          const existingSub = await prisma_default.subscription.findFirst({
            where: { userId, courseId: cId }
          });
          if (!existingSub) {
            const np = /* @__PURE__ */ new Date();
            np.setMonth(np.getMonth() + 1);
            await prisma_default.subscription.create({
              data: {
                userId,
                courseId: cId,
                amount: monthlyAmt / courseIdList.length,
                status: "ACTIVE",
                nextPayment: np,
                formule: user?.pays && user.pays.toLowerCase() !== "c\xF4te d'ivoire" ? "en_ligne" : "presentiel",
                coursParticuliers: false
              }
            });
          }
        }
        console.log(`[Webhook] Formation(s) suppl\xE9mentaire(s) ajout\xE9e(s) pour userId: ${userId}`);
      } else if (metadata.action === "register" && metadata.pending_token) {
        const pending = await prisma_default.pendingRegistration.findUnique({
          where: { token: metadata.pending_token }
        });
        if (pending && /* @__PURE__ */ new Date() <= pending.expiresAt) {
          let user = await prisma_default.user.findUnique({ where: { email: pending.email } });
          if (!user) {
            user = await prisma_default.user.create({
              data: {
                email: pending.email,
                password: pending.passwordHash,
                name: pending.name || pending.email,
                telephone: pending.telephone || "",
                pays: pending.pays || "",
                ville: pending.ville || "",
                role: "STUDENT",
                isActive: true
              }
            });
            const matricule = await generateMatricule();
            await prisma_default.user.update({ where: { id: user.id }, data: { matricule } });
          }
          const courseIdList = Array.isArray(pending.courseIds) ? pending.courseIds : [];
          const monthlyAmt = pending.monthlyAmount ?? 0;
          const existingPayment = await prisma_default.payment.findFirst({
            where: { geniusPayReference: reference }
          });
          if (!existingPayment) {
            const payment = await prisma_default.payment.create({
              data: { amount: data.amount || 0, userId: user.id, status: "SUCCESS", geniusPayReference: reference }
            });
            const receiptNumber = generateReceiptNumber();
            await prisma_default.payment.update({ where: { id: payment.id }, data: { receiptNumber } });
          }
          for (const cId of courseIdList) {
            const existingSub = await prisma_default.subscription.findFirst({
              where: { userId: user.id, courseId: cId }
            });
            if (!existingSub) {
              const np = /* @__PURE__ */ new Date();
              np.setMonth(np.getMonth() + 1);
              await prisma_default.subscription.create({
                data: {
                  userId: user.id,
                  courseId: cId,
                  amount: monthlyAmt,
                  status: "ACTIVE",
                  nextPayment: np,
                  formule: pending.mode || "presentiel",
                  coursParticuliers: pending.coursParticuliers
                }
              });
            }
          }
          await prisma_default.pendingRegistration.delete({ where: { id: pending.id } }).catch(() => {
          });
          console.log(`[Webhook] Utilisateur cr\xE9\xE9 depuis paiement (token s\xE9curis\xE9)`);
        } else {
          console.warn("[Webhook] pending_token expir\xE9 ou introuvable:", metadata.pending_token);
        }
      } else if (metadata.type === "mensualite" && metadata.subscription_id) {
        const nbMonths = parseInt(metadata.months) || 1;
        const existingPayment = await prisma_default.payment.findFirst({
          where: { geniusPayReference: reference }
        });
        if (!existingPayment) {
          const payment = await prisma_default.payment.create({
            data: {
              amount: data.amount || 0,
              userId: metadata.user_id,
              courseId: metadata.course_id,
              status: "SUCCESS",
              geniusPayReference: reference
            }
          });
          const receiptNumber = generateReceiptNumber();
          await prisma_default.payment.update({ where: { id: payment.id }, data: { receiptNumber } });
        }
        const sub = await prisma_default.subscription.findUnique({ where: { id: metadata.subscription_id } });
        if (sub) {
          const nextPayment = new Date(sub.nextPayment);
          nextPayment.setMonth(nextPayment.getMonth() + nbMonths);
          await prisma_default.subscription.update({
            where: { id: metadata.subscription_id },
            data: { nextPayment, status: "ACTIVE" }
          });
        }
      } else {
        if (reference) {
          await prisma_default.payment.updateMany({
            where: { geniusPayReference: reference },
            data: { status: "SUCCESS" }
          });
        }
        const userId = metadata.user_id;
        const courseId = metadata.course_id;
        if (userId && courseId) {
          await prisma_default.subscription.updateMany({
            where: { userId, courseId, status: "PENDING" },
            data: { status: "ACTIVE" }
          });
          await prisma_default.user.update({ where: { id: userId }, data: { isActive: true } });
        }
      }
      console.log(`[Webhook] Paiement r\xE9ussi - r\xE9f\xE9rence: ${reference}`);
    } else if (event === "payment.failed" || payload.event === "payment.failed") {
      const data = payload.data || payload;
      const reference = data.reference;
      const metadata = data.metadata || {};
      if (reference) {
        await prisma_default.payment.updateMany({
          where: { geniusPayReference: reference },
          data: { status: "FAILED" }
        });
      }
      if (metadata.pending_token) {
        await prisma_default.pendingRegistration.delete({ where: { token: metadata.pending_token } }).catch(() => {
        });
      }
      console.log(`[Webhook] Paiement \xE9chou\xE9 - r\xE9f\xE9rence: ${reference}`);
    }
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("[Webhook] Erreur de traitement:", error);
    res.status(200).json({ received: true });
  }
};

// server/routes/paymentRoutes.ts
var router2 = Router2();
var webhookLimiter = rateLimit({
  windowMs: 60 * 1e3,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de requ\xEAtes webhook." }
});
router2.post("/webhook", webhookLimiter, handleWebhook);
router2.use(authenticateToken);
router2.get("/geniuspay/status/:reference", requireRole(["ADMIN", "ACCOUNTANT"]), checkPaymentStatus);
router2.get("/my-payments", getMyPayments);
router2.get("/", requireRole(["ADMIN", "ACCOUNTANT"]), getPayments);
router2.post("/initialize", requireRole(["ADMIN", "ACCOUNTANT"]), initializePayment);
router2.post("/verify", requireRole(["ADMIN", "ACCOUNTANT"]), verifyPayment);
router2.post("/geniuspay/init", requireRole(["ADMIN", "ACCOUNTANT"]), initPayment);
var paymentRoutes_default = router2;

// server/routes/authRoutes.ts
import { Router as Router3 } from "express";
import rateLimit2 from "express-rate-limit";

// server/controllers/authController.ts
import bcrypt2 from "bcrypt";

// server/utils/jwt.ts
import jwt2 from "jsonwebtoken";
var JWT_SECRET = process.env.JWT_SECRET;
var TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
function signToken(userId, role) {
  return jwt2.sign({ userId, role }, JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
}
function setAuthCookie(res, userId, role) {
  const token = signToken(userId, role);
  res.cookie("token", token, {
    httpOnly: true,
    // Inaccessible via JavaScript côté client
    secure: process.env.NODE_ENV === "production",
    // HTTPS uniquement en production
    sameSite: "strict",
    // Protection CSRF stricte
    maxAge: TOKEN_TTL_SECONDS * 1e3,
    // Durée en millisecondes
    path: "/"
  });
}
function clearAuthCookie(res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/"
  });
}

// server/controllers/authController.ts
function maskEmail(email) {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const [domainName, ...tld] = domain.split(".");
  const maskedLocal = local.slice(0, 2) + "**";
  const maskedDomain = domainName.slice(0, 1) + "***";
  return `${maskedLocal}@${maskedDomain}.${tld.join(".")}`;
}
async function retryWithNeonWakeup(fn, retries = 2, delayMs = 2e3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err?.message || String(err);
      const isConnError = msg.includes("Can't reach database") || msg.includes("P1001") || msg.includes("timeout") || msg.includes("Connection terminated") || msg.includes("ETIMEDOUT");
      if (isConnError && attempt < retries) {
        console.log(`[Neon DB] Base en cours de r\xE9veil... tentative ${attempt + 1}/${retries}`);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw err;
    }
  }
  return fn();
}
var register = async (req, res) => {
  try {
    const { email, password, name, nom, prenom, telephone, pays, ville } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe sont requis" });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caract\xE8res" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await prisma_default.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(400).json({ error: "Cet email est d\xE9j\xE0 utilis\xE9" });
    }
    const hashedPassword = await bcrypt2.hash(password, 12);
    const fullName = name || [prenom, nom].filter(Boolean).join(" ") || cleanEmail;
    const user = await prisma_default.user.create({
      data: {
        email: cleanEmail,
        password: hashedPassword,
        name: fullName,
        telephone,
        pays,
        ville,
        role: "STUDENT",
        isActive: true
      }
    });
    if (user.role === "STUDENT") {
      const matricule = await generateMatricule();
      await prisma_default.user.update({ where: { id: user.id }, data: { matricule } });
    }
    setAuthCookie(res, user.id, user.role);
    try {
      await sendNotification(
        user.id,
        "Bienvenue chez Excellence Acad\xE9mie !",
        "Votre compte a \xE9t\xE9 cr\xE9\xE9 avec succ\xE8s. Acc\xE9dez d\xE8s \xE0 pr\xE9sent \xE0 vos cours, emplois du temps et ressources."
      );
      await sendNotificationToRole(
        "ADMIN",
        "Nouvelle inscription",
        `Un nouvel \xE9tudiant vient de s'inscrire sur la plateforme.`
      );
    } catch (err) {
      console.error("Notification error on registration:", err);
    }
    res.status(201).json({ message: "Compte cr\xE9\xE9 avec succ\xE8s", userId: user.id });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Erreur lors de la cr\xE9ation du compte" });
  }
};
var registerAndPay = async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      nom,
      prenom,
      telephone,
      pays,
      ville,
      courseIds,
      mode,
      coursParticuliers,
      paymentMethod,
      geniusPhone,
      dateNaissance
    } = req.body;
    if (!email || !password || !courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({ error: "Email, mot de passe et au moins un concours sont requis" });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caract\xE8res" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await prisma_default.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(400).json({ error: "Cet email est d\xE9j\xE0 utilis\xE9" });
    }
    const courses = await prisma_default.course.findMany({ where: { id: { in: courseIds } } });
    if (courses.length !== courseIds.length) {
      return res.status(404).json({ error: "Une ou plusieurs formations introuvables" });
    }
    const isDiasporaFlag = pays && pays.trim().toLowerCase() !== "c\xF4te d'ivoire" && pays.trim().toLowerCase() !== "cote d'ivoire";
    const effectiveMode = isDiasporaFlag ? "en_ligne" : mode || "presentiel";
    const cParticuliers = coursParticuliers === true;
    const registrationAmount = calcRegistrationTotal(courses, cParticuliers, pays, ville);
    const monthlyAmount = calcMonthlyTotal(courses, cParticuliers, pays, effectiveMode);
    const amount = registrationAmount + monthlyAmount;
    const hashedPassword = await bcrypt2.hash(password, 12);
    const fullName = name || [prenom, nom].filter(Boolean).join(" ") || cleanEmail;
    const paymentPhone = geniusPhone || telephone || "";
    const frontendUrl2 = process.env.FRONTEND_URL || "http://localhost:5173";
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
    const pending = await prisma_default.pendingRegistration.create({
      data: {
        email: cleanEmail,
        passwordHash: hashedPassword,
        name: fullName,
        telephone: telephone || "",
        pays: pays || "",
        ville: ville || "",
        courseIds,
        mode: effectiveMode,
        coursParticuliers: cParticuliers,
        monthlyAmount,
        dateNaissance: dateNaissance || "",
        geniusPhone: paymentPhone,
        expiresAt
      }
    });
    const courseTitles = courses.map((c) => c.title).join(", ");
    const label = cParticuliers ? "Cours particuliers" : `Inscription (${effectiveMode})`;
    const geniusPayBody = {
      amount,
      description: `Inscription + 1er mois: ${fullName} - ${courseTitles} (${label})`,
      customer: {
        name: fullName,
        phone: paymentPhone,
        email: cleanEmail,
        country: COUNTRY_TO_ISO2[pays || ""] || "CI"
      },
      metadata: {
        action: "register",
        pending_token: pending.token
        // Token sécurisé uniquement — pas de données sensibles
      },
      success_url: `${frontendUrl2}/payment/success`,
      error_url: `${frontendUrl2}/payment/error`
    };
    if (paymentMethod && METHOD_TO_GP[paymentMethod]) {
      geniusPayBody.payment_method = METHOD_TO_GP[paymentMethod];
    }
    const response = await fetch(`${GENIUSPAY_API_BASE}/payments`, {
      method: "POST",
      headers: geniusPayHeaders(),
      body: JSON.stringify(geniusPayBody),
      signal: AbortSignal.timeout(15e3)
    });
    const gpData = await handleGeniusPayResponse(response);
    if (!gpData) {
      await prisma_default.pendingRegistration.delete({ where: { id: pending.id } }).catch(() => {
      });
      return res.status(502).json({ error: "Le service de paiement est temporairement indisponible" });
    }
    const usedUrl = paymentMethod && METHOD_TO_GP[paymentMethod] ? gpData.payment_url || gpData.checkout_url : gpData.checkout_url || gpData.payment_url;
    res.status(200).json({
      success: true,
      checkoutUrl: usedUrl,
      reference: gpData.reference
    });
  } catch (error) {
    console.error("Register and pay error:", error?.message || error);
    res.status(500).json({ error: "Erreur lors de l'initialisation du paiement" });
  }
};
var addCourseForExistingStudent = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Non authentifi\xE9" });
    const { courseIds, paymentMethod, geniusPhone, mode } = req.body;
    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({ error: "S\xE9lectionnez au moins une formation" });
    }
    const user = await prisma_default.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    const courses = await prisma_default.course.findMany({ where: { id: { in: courseIds } } });
    if (courses.length !== courseIds.length) {
      return res.status(404).json({ error: "Une ou plusieurs formations introuvables" });
    }
    const existingSubs = await prisma_default.subscription.findMany({
      where: { userId, courseId: { in: courseIds }, status: "ACTIVE" },
      select: { courseId: true }
    });
    const alreadySubscribed = existingSubs.map((s) => s.courseId);
    const newCourseIds = courseIds.filter((id) => !alreadySubscribed.includes(id));
    if (newCourseIds.length === 0) {
      return res.status(400).json({ error: "Vous \xEAtes d\xE9j\xE0 inscrit \xE0 toutes ces formations" });
    }
    const newCourses = courses.filter((c) => newCourseIds.includes(c.id));
    let additionalAmount = 1e4;
    try {
      const settings = await prisma_default.appSettings.findUnique({ where: { key: "global" } });
      if (settings) additionalAmount = settings.additionalCourseAmount;
    } catch {
    }
    const pays = user.pays || "";
    const effectiveMode = mode || "presentiel";
    const monthlyAmount = calcMonthlyTotal(newCourses, false, pays, effectiveMode);
    const amount = monthlyAmount + additionalAmount;
    const frontendUrl2 = process.env.FRONTEND_URL || "http://localhost:5173";
    const paymentPhone = geniusPhone || user.telephone || "";
    const courseTitles = newCourses.map((c) => c.title).join(", ");
    const geniusPayBody = {
      amount,
      description: `Formation suppl\xE9mentaire: ${user.name} - ${courseTitles}`,
      customer: {
        name: user.name || "",
        phone: paymentPhone,
        email: user.email,
        country: COUNTRY_TO_ISO2[pays] || "CI"
      },
      metadata: {
        action: "add_course",
        user_id: userId,
        course_ids: newCourseIds.join(","),
        additional_amount: additionalAmount,
        monthly_amount: monthlyAmount
      },
      success_url: `${frontendUrl2}/student/dashboard?tab=courses&added=1`,
      error_url: `${frontendUrl2}/student/dashboard?tab=courses&error=1`
    };
    if (paymentMethod && METHOD_TO_GP[paymentMethod]) {
      geniusPayBody.payment_method = METHOD_TO_GP[paymentMethod];
    }
    const response = await fetch(`${GENIUSPAY_API_BASE}/payments`, {
      method: "POST",
      headers: geniusPayHeaders(),
      body: JSON.stringify(geniusPayBody),
      signal: AbortSignal.timeout(15e3)
    });
    const gpData = await handleGeniusPayResponse(response);
    if (!gpData) {
      return res.status(502).json({ error: "Le service de paiement est temporairement indisponible" });
    }
    const usedUrl = paymentMethod && METHOD_TO_GP[paymentMethod] ? gpData.payment_url || gpData.checkout_url : gpData.checkout_url || gpData.payment_url;
    res.status(200).json({
      success: true,
      checkoutUrl: usedUrl,
      reference: gpData.reference,
      amount,
      monthlyAmount,
      additionalAmount
    });
  } catch (error) {
    console.error("addCourseForExistingStudent error:", error?.message || error);
    res.status(500).json({ error: "Erreur lors de l'ajout de la formation" });
  }
};
var confirmPayment = async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ error: "R\xE9f\xE9rence requise" });
    }
    const gpResponse = await fetch(`${GENIUSPAY_API_BASE}/payments/${reference}`, {
      headers: { ...geniusPayHeaders(), Accept: "application/json" },
      signal: AbortSignal.timeout(15e3)
    });
    const gpData = await handleGeniusPayResponse(gpResponse);
    if (!gpData) {
      return res.status(404).json({ error: "Transaction introuvable" });
    }
    const metadata = gpData.metadata || {};
    if (gpData.status === "completed" || gpData.status === "success") {
      const pendingToken = metadata.pending_token;
      if (!pendingToken) {
        return res.status(400).json({ error: "Token d'inscription manquant dans les m\xE9tadonn\xE9es" });
      }
      const pending = await prisma_default.pendingRegistration.findUnique({
        where: { token: pendingToken }
      });
      if (!pending) {
        return res.status(400).json({
          error: "Donn\xE9es d'inscription expir\xE9es ou d\xE9j\xE0 trait\xE9es. Contactez le support."
        });
      }
      if (/* @__PURE__ */ new Date() > pending.expiresAt) {
        await prisma_default.pendingRegistration.delete({ where: { id: pending.id } });
        return res.status(400).json({ error: "Session d'inscription expir\xE9e. Veuillez recommencer." });
      }
      const courseIdList = Array.isArray(pending.courseIds) ? pending.courseIds : [];
      const pendingCourses = await prisma_default.course.findMany({ where: { id: { in: courseIdList } } });
      const inscriptionAmount = calcRegistrationTotal(pendingCourses, pending.coursParticuliers, pending.pays, pending.ville);
      const monthlyAmt = pending.monthlyAmount && pending.monthlyAmount > 0 ? pending.monthlyAmount : calcMonthlyTotal(pendingCourses, pending.coursParticuliers, pending.pays, pending.mode || "presentiel");
      const totalAmount = inscriptionAmount + monthlyAmt;
      const result = await prisma_default.$transaction(async (tx) => {
        let user = await tx.user.findUnique({ where: { email: pending.email } });
        if (!user) {
          user = await tx.user.create({
            data: {
              email: pending.email,
              password: pending.passwordHash,
              name: pending.name || pending.email,
              telephone: pending.telephone || "",
              pays: pending.pays || "",
              ville: pending.ville || "",
              role: "STUDENT",
              isActive: true
            }
          });
        }
        if (!user.matricule && user.role === "STUDENT") {
          const matricule = await generateMatricule();
          await tx.user.update({ where: { id: user.id }, data: { matricule } });
        }
        const existingPayment = await tx.payment.findFirst({
          where: { geniusPayReference: reference }
        });
        if (!existingPayment) {
          const payment = await tx.payment.create({
            data: {
              amount: gpData.amount || totalAmount,
              userId: user.id,
              status: "SUCCESS",
              geniusPayReference: reference
            }
          });
          const receiptNumber = generateReceiptNumber();
          await tx.payment.update({ where: { id: payment.id }, data: { receiptNumber } });
        }
        for (const cId of courseIdList) {
          const existingSub = await tx.subscription.findFirst({
            where: { userId: user.id, courseId: cId }
          });
          if (!existingSub) {
            const nextPayment = /* @__PURE__ */ new Date();
            nextPayment.setMonth(nextPayment.getMonth() + 1);
            await tx.subscription.create({
              data: {
                userId: user.id,
                courseId: cId,
                amount: monthlyAmt,
                status: "ACTIVE",
                nextPayment,
                formule: pending.mode || "presentiel",
                coursParticuliers: pending.coursParticuliers
              }
            });
          }
        }
        await tx.pendingRegistration.delete({ where: { id: pending.id } }).catch(() => {
        });
        return user;
      });
      try {
        await sendNotification(
          result.id,
          "Inscription et paiement valid\xE9s",
          `Votre paiement de ${totalAmount.toLocaleString("fr-FR")} FCFA a \xE9t\xE9 re\xE7u. Bienvenue !`
        );
        await sendNotificationToRole(
          "ADMIN",
          "Paiement inscription re\xE7u",
          `Un nouvel \xE9tudiant a finalis\xE9 son inscription et pay\xE9 ${totalAmount.toLocaleString("fr-FR")} FCFA.`
        );
      } catch (err) {
        console.error("Notification error on payment confirmation:", err);
      }
      setAuthCookie(res, result.id, result.role);
      return res.json({
        success: true,
        status: gpData.status,
        user: { id: result.id, email: result.email, name: result.name, role: result.role }
      });
    }
    res.json({
      success: false,
      status: gpData.status,
      message: "Le paiement n'a pas abouti"
    });
  } catch (error) {
    console.error("Confirm payment error:", error?.message || error);
    res.status(500).json({ error: "Erreur de confirmation du paiement" });
  }
};
var login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Format de donn\xE9es invalide" });
    }
    const cleanEmail = email.trim().toLowerCase();
    let user = null;
    try {
      user = await retryWithNeonWakeup(
        () => prisma_default.user.findFirst({
          where: { email: { equals: cleanEmail, mode: "insensitive" } }
        })
      );
    } catch (dbErr) {
      try {
        user = await retryWithNeonWakeup(
          () => prisma_default.user.findUnique({ where: { email: cleanEmail } })
        );
      } catch (innerErr) {
        console.error("[AUTH] Erreur base de donn\xE9es critique :", innerErr?.message || innerErr);
        return res.status(500).json({
          error: "Erreur serveur lors de la connexion",
          details: "Connexion \xE0 la base de donn\xE9es impossible."
        });
      }
    }
    if (!user || !user.password) {
      await bcrypt2.compare(password, "$2b$12$invalid.hash.to.prevent.timing.attacks.xxxxxxxx");
      console.log(`[AUTH] Tentative \xE9chou\xE9e pour : ${maskEmail(cleanEmail)}`);
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }
    const isMatch = await bcrypt2.compare(password, user.password);
    if (!isMatch) {
      console.log(`[AUTH] Mot de passe invalide pour : ${maskEmail(cleanEmail)}`);
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: "Compte d\xE9sactiv\xE9. Contactez l'administration." });
    }
    setAuthCookie(res, user.id, user.role);
    try {
      await prisma_default.user.update({ where: { id: user.id }, data: { lastLoginAt: /* @__PURE__ */ new Date() } });
    } catch {
    }
    console.log(`[AUTH] Connexion r\xE9ussie : ${maskEmail(cleanEmail)} (${user.role})`);
    res.json({
      message: "Connexion r\xE9ussie",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error?.message || error);
    res.status(500).json({ error: "Erreur serveur lors de la connexion" });
  }
};
var logout = (req, res) => {
  if (req.user?.id) invalidateUserCache(req.user.id);
  clearAuthCookie(res);
  res.json({ message: "D\xE9connexion r\xE9ussie" });
};
var getMe = async (req, res) => {
  try {
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
        telephone: true,
        ville: true,
        pays: true,
        isActive: true,
        matricule: true
      }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration du profil" });
  }
};

// server/routes/authRoutes.ts
var router3 = Router3();
var loginLimiter = rateLimit2({
  windowMs: 15 * 60 * 1e3,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Trop de tentatives de connexion. Veuillez r\xE9essayer dans 15 minutes."
  },
  skipSuccessfulRequests: true
  // Ne compte que les échecs
});
var registerLimiter = rateLimit2({
  windowMs: 60 * 60 * 1e3,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Trop d'inscriptions depuis cette adresse. Veuillez r\xE9essayer dans une heure."
  }
});
var paymentInitLimiter = rateLimit2({
  windowMs: 60 * 60 * 1e3,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Trop de tentatives de paiement. Veuillez r\xE9essayer dans une heure."
  }
});
router3.post("/login", loginLimiter, login);
router3.post("/logout", logout);
router3.post("/register", registerLimiter, register);
router3.post("/register-and-pay", registerLimiter, paymentInitLimiter, registerAndPay);
router3.get("/me", authenticateToken, getMe);
router3.post("/confirm-payment", authenticateToken, confirmPayment);
router3.post("/add-course", authenticateToken, paymentInitLimiter, addCourseForExistingStudent);
var authRoutes_default = router3;

// server/routes/notificationRoutes.ts
import { Router as Router4 } from "express";
var router4 = Router4();
router4.use(authenticateToken);
router4.get("/stream", streamNotifications);
router4.get("/", getNotifications);
router4.put("/read-all", markAllAsRead);
router4.put("/:id/read", markAsRead);
router4.post("/bulk", requireRole(["ADMIN"]), sendBulkNotification);
var notificationRoutes_default = router4;

// server/routes/expenseRoutes.ts
import { Router as Router5 } from "express";

// server/controllers/expenseController.ts
var createExpense = async (req, res) => {
  try {
    const { amount, description, category, ville, teacherId, paymentMethod, attachmentUrl } = req.body;
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Le montant doit \xEAtre un nombre positif" });
    }
    const expense = await prisma_default.expense.create({
      data: {
        amount: parsedAmount,
        description,
        category: category || null,
        ville: ville || null,
        teacherId: teacherId || null,
        paymentMethod,
        attachmentUrl: attachmentUrl || null,
        status: "PAID"
      },
      include: {
        teacher: { select: { id: true, name: true, email: true } }
      }
    });
    if (teacherId) {
      await sendNotification(
        teacherId,
        "Nouveau paiement re\xE7u",
        `Vous avez re\xE7u un paiement de ${amount} FCFA pour : ${description}. M\xE9thode : ${paymentMethod}`
      );
    }
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: "Failed to create expense" });
  }
};
var getExpenses = async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
    if (category) {
      where.category = category;
    }
    const expenses = await prisma_default.expense.findMany({
      where,
      include: {
        teacher: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
};
var updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description, category, ville, paymentMethod, status, teacherId, attachmentUrl } = req.body;
    const data = {};
    if (amount !== void 0) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: "Le montant doit \xEAtre un nombre positif" });
      }
      data.amount = parsedAmount;
    }
    if (description !== void 0) data.description = description;
    if (category !== void 0) data.category = category;
    if (ville !== void 0) data.ville = ville;
    if (paymentMethod !== void 0) data.paymentMethod = paymentMethod;
    if (status !== void 0) data.status = status;
    if (teacherId !== void 0) data.teacherId = teacherId;
    if (attachmentUrl !== void 0) data.attachmentUrl = attachmentUrl;
    const expense = await prisma_default.expense.update({
      where: { id },
      data,
      include: {
        teacher: { select: { id: true, name: true, email: true } }
      }
    });
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: "Failed to update expense" });
  }
};
var deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma_default.expense.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete expense" });
  }
};
var getExpenseSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = { status: "PAID" };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
    const expenses = await prisma_default.expense.findMany({ where });
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const months = ["Janvier", "F\xE9vrier", "Mars", "Avril", "Mai", "Juin", "Juillet", "Ao\xFBt", "Septembre", "Octobre", "Novembre", "D\xE9cembre"];
    const byCategory = {};
    const byMonth = {};
    const byPaymentMethod = {};
    expenses.forEach((e) => {
      const cat = e.category || "AUTRE";
      byCategory[cat] = (byCategory[cat] || 0) + e.amount;
      const monthIdx = new Date(e.createdAt).getMonth();
      const key = `${months[monthIdx]} ${new Date(e.createdAt).getFullYear()}`;
      byMonth[key] = (byMonth[key] || 0) + e.amount;
      const method = e.paymentMethod || "Non sp\xE9cifi\xE9";
      byPaymentMethod[method] = (byPaymentMethod[method] || 0) + e.amount;
    });
    res.json({
      totalExpenses,
      count: expenses.length,
      byCategory: Object.entries(byCategory).map(([category, amount]) => ({ category, amount })),
      byMonth: Object.entries(byMonth).map(([month, amount]) => ({ month, amount })),
      byPaymentMethod: Object.entries(byPaymentMethod).map(([method, amount]) => ({ method, amount }))
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch expense summary" });
  }
};

// server/routes/expenseRoutes.ts
import multer2 from "multer";
import path3 from "path";
import crypto3 from "crypto";
var router5 = Router5();
router5.use(authenticateToken);
var storage = multer2.diskStorage({
  destination: (_req, _file, cb) => cb(null, path3.join(process.cwd(), "uploads")),
  filename: (_req, file, cb) => {
    const ext = path3.extname(file.originalname);
    cb(null, `expense-${crypto3.randomUUID()}${ext}`);
  }
});
var upload2 = multer2({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx"];
    const ext = path3.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Type de fichier non support\xE9"));
  }
});
router5.post("/upload", requireRole(["ADMIN", "ACCOUNTANT"]), upload2.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier fourni" });
  }
  const url = `/uploads/${req.file.filename}`;
  res.status(201).json({ url, filename: req.file.originalname });
});
router5.post("/", requireRole(["ADMIN", "ACCOUNTANT"]), createExpense);
router5.get("/", requireRole(["ADMIN", "ACCOUNTANT"]), getExpenses);
router5.get("/summary", requireRole(["ADMIN", "ACCOUNTANT"]), getExpenseSummary);
router5.put("/:id", requireRole(["ADMIN", "ACCOUNTANT"]), updateExpense);
router5.delete("/:id", requireRole(["ADMIN", "ACCOUNTANT"]), deleteExpense);
var expenseRoutes_default = router5;

// server/routes/statsRoutes.ts
import { Router as Router6 } from "express";

// server/controllers/statsController.ts
var MONTHS = ["Janvier", "F\xE9vrier", "Mars", "Avril", "Mai", "Juin", "Juillet", "Ao\xFBt", "Septembre", "Octobre", "Novembre", "D\xE9cembre"];
var getDashboardStats = async (req, res) => {
  try {
    const [totalStudents, totalTeachers] = await Promise.all([
      prisma_default.user.count({ where: { role: "STUDENT" } }),
      prisma_default.user.count({ where: { role: "TEACHER" } })
    ]);
    const [paymentAgg, shopAgg, expenseAgg] = await Promise.all([
      prisma_default.payment.groupBy({
        by: ["courseId"],
        where: { status: "SUCCESS" },
        _sum: { amount: true },
        _count: true
      }),
      prisma_default.shopOrder.aggregate({
        where: { status: { in: ["PAID", "DELIVERED"] } },
        _sum: { totalAmount: true },
        _count: true
      }),
      prisma_default.expense.aggregate({
        where: { status: "PAID" },
        _sum: { amount: true }
      })
    ]);
    const totalRevenueFromPayments = paymentAgg.reduce((s, g) => s + (g._sum.amount || 0), 0);
    const totalRevenueFromShop = shopAgg._sum.totalAmount || 0;
    const totalRevenue = totalRevenueFromPayments + totalRevenueFromShop;
    const totalExpenses = expenseAgg._sum.amount || 0;
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    const [monthlyPayments, monthlyExpenses, monthlyShopOrders] = await Promise.all([
      prisma_default.$queryRaw`
        SELECT EXTRACT(MONTH FROM "createdAt")::int AS month, SUM("amount")::float AS total
        FROM "Payment" WHERE "status" = 'SUCCESS' AND EXTRACT(YEAR FROM "createdAt") = ${currentYear}
        GROUP BY month
      `,
      prisma_default.$queryRaw`
        SELECT EXTRACT(MONTH FROM "createdAt")::int AS month, SUM("amount")::float AS total
        FROM "Expense" WHERE "status" = 'PAID' AND EXTRACT(YEAR FROM "createdAt") = ${currentYear}
        GROUP BY month
      `,
      prisma_default.$queryRaw`
        SELECT EXTRACT(MONTH FROM "createdAt")::int AS month, SUM("totalAmount")::float AS total
        FROM "ShopOrder" WHERE "status" IN ('PAID','DELIVERED') AND EXTRACT(YEAR FROM "createdAt") = ${currentYear}
        GROUP BY month
      `
    ]);
    const chartDataMap = {};
    for (const m of MONTHS) chartDataMap[m] = { name: m, Revenus: 0, Depenses: 0 };
    for (const row of monthlyPayments) {
      const name = MONTHS[row.month - 1];
      if (chartDataMap[name]) chartDataMap[name].Revenus += row.total;
    }
    for (const row of monthlyShopOrders) {
      const name = MONTHS[row.month - 1];
      if (chartDataMap[name]) chartDataMap[name].Revenus += row.total;
    }
    for (const row of monthlyExpenses) {
      const name = MONTHS[row.month - 1];
      if (chartDataMap[name]) chartDataMap[name].Depenses += row.total;
    }
    const chartData = Object.values(chartDataMap);
    const courses = await prisma_default.course.findMany({ select: { id: true, title: true } });
    const courseMap = new Map(courses.map((c) => [c.id, c.title]));
    const revenueByCourseData = paymentAgg.filter((g) => g.courseId && courseMap.get(g.courseId)).map((g) => ({ name: courseMap.get(g.courseId), Revenus: g._sum.amount || 0 })).sort((a, b) => b.Revenus - a.Revenus);
    const [enrollmentsByMonth] = await Promise.all([
      prisma_default.$queryRaw`
        SELECT EXTRACT(MONTH FROM "createdAt")::int AS month, COUNT(*)::int AS count
        FROM "Payment" WHERE "status" = 'SUCCESS' AND EXTRACT(YEAR FROM "createdAt") = ${currentYear}
        GROUP BY month
      `
    ]);
    const enrollmentsData = enrollmentsByMonth.map((e) => ({
      name: MONTHS[e.month - 1],
      Inscriptions: Number(e.count)
    }));
    const [revenueByCityRaw, expenseByCityRaw] = await Promise.all([
      prisma_default.$queryRaw`
        SELECT COALESCE(u."ville", 'Non précisée') AS city, SUM(p."amount")::float AS revenue, COUNT(*)::int AS count
        FROM "Payment" p LEFT JOIN "User" u ON p."userId" = u."id"
        WHERE p."status" = 'SUCCESS'
        GROUP BY city ORDER BY revenue DESC
      `,
      prisma_default.$queryRaw`
        SELECT COALESCE("ville", 'Non précisée') AS city, SUM("amount")::float AS expense, COUNT(*)::int AS count
        FROM "Expense" WHERE "status" = 'PAID'
        GROUP BY city
      `
    ]);
    const cityMap = /* @__PURE__ */ new Map();
    for (const r of revenueByCityRaw) {
      cityMap.set(r.city, { revenue: r.revenue, revenueCount: Number(r.count), expense: 0, expenseCount: 0 });
    }
    for (const e of expenseByCityRaw) {
      const existing = cityMap.get(e.city) || { revenue: 0, revenueCount: 0, expense: 0, expenseCount: 0 };
      existing.expense = e.expense;
      existing.expenseCount = Number(e.count);
      cityMap.set(e.city, existing);
    }
    const revenueByCityData = Array.from(cityMap.entries()).map(([city, data]) => ({
      name: city,
      Revenus: data.revenue
    }));
    const recentPayments = await prisma_default.payment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } }
    });
    res.json({
      totalStudents,
      totalTeachers,
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      recentPayments,
      chartData,
      enrollmentsData,
      revenueByCourseData,
      revenueByCityData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};
var getCityBreakdown = async (req, res) => {
  try {
    const [revenueByCityRaw, expenseByCityRaw] = await Promise.all([
      prisma_default.$queryRaw`
        SELECT COALESCE(u."ville", 'Non précisée') AS city, SUM(p."amount")::float AS revenue, COUNT(*)::int AS count
        FROM "Payment" p LEFT JOIN "User" u ON p."userId" = u."id"
        WHERE p."status" = 'SUCCESS'
        GROUP BY city ORDER BY revenue DESC
      `,
      prisma_default.$queryRaw`
        SELECT COALESCE("ville", 'Non précisée') AS city, SUM("amount")::float AS expense, COUNT(*)::int AS count
        FROM "Expense" WHERE "status" = 'PAID'
        GROUP BY city
      `
    ]);
    const cityMap = /* @__PURE__ */ new Map();
    for (const r of revenueByCityRaw) {
      cityMap.set(r.city, { revenue: r.revenue, revenueCount: Number(r.count), expense: 0, expenseCount: 0 });
    }
    for (const e of expenseByCityRaw) {
      const existing = cityMap.get(e.city) || { revenue: 0, revenueCount: 0, expense: 0, expenseCount: 0 };
      existing.expense = e.expense;
      existing.expenseCount = Number(e.count);
      cityMap.set(e.city, existing);
    }
    const cityData = Array.from(cityMap.entries()).map(([city, data]) => ({
      city,
      revenue: data.revenue,
      revenueCount: data.revenueCount,
      expense: data.expense,
      expenseCount: data.expenseCount,
      net: data.revenue - data.expense
    })).sort((a, b) => b.revenue - a.revenue);
    res.json(cityData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch city breakdown" });
  }
};

// server/routes/statsRoutes.ts
var router6 = Router6();
router6.use(authenticateToken);
router6.get("/", requireRole(["ADMIN", "ACCOUNTANT"]), getDashboardStats);
router6.get("/city-breakdown", requireRole(["ADMIN", "ACCOUNTANT"]), getCityBreakdown);
var statsRoutes_default = router6;

// server/routes/receiptRoutes.ts
import { Router as Router7 } from "express";

// server/controllers/receiptController.ts
var getReceipts = async (req, res) => {
  try {
    const receipts = await prisma_default.receipt.findMany({
      include: {
        payment: { include: { user: { select: { id: true, name: true, email: true } } } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(receipts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch receipts" });
  }
};
var generateReceipt = async (req, res) => {
  try {
    const paymentId = req.params.paymentId;
    const payment = await prisma_default.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: true,
        course: true,
        receipt: true
      }
    });
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }
    if (payment.receipt) {
      return res.json(payment.receipt);
    }
    const escapeHtml = (str) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const userName = escapeHtml(payment.user?.name || payment.user?.email || "");
    const courseTitle = payment.course ? escapeHtml(payment.course.title) : "";
    const content = `
      <h1>Re\xE7u de Paiement</h1>
      <p><strong>Acad\xE9mie:</strong> Excellence Acad\xE9mie</p>
      <p><strong>Date:</strong> ${new Date(payment.createdAt).toLocaleDateString()}</p>
      <p><strong>\xC9tudiant:</strong> ${userName}</p>
      <p><strong>Montant:</strong> ${payment.amount} FCFA</p>
      <p><strong>Statut:</strong> ${escapeHtml(payment.status)}</p>
      ${payment.course ? `<p><strong>Cours:</strong> ${courseTitle}</p>` : ""}
    `;
    const receipt = await prisma_default.receipt.create({
      data: {
        paymentId: payment.id,
        userId: payment.userId,
        content
      }
    });
    res.status(201).json(receipt);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate receipt" });
  }
};

// server/routes/receiptRoutes.ts
var router7 = Router7();
router7.use(authenticateToken);
router7.get("/", requireRole(["ADMIN", "ACCOUNTANT"]), getReceipts);
router7.post("/:paymentId", requireRole(["ADMIN", "ACCOUNTANT"]), generateReceipt);
var receiptRoutes_default = router7;

// server/routes/testimonialRoutes.ts
import { Router as Router8 } from "express";
import multer3 from "multer";
import rateLimit3 from "express-rate-limit";
import path4 from "path";
import fs3 from "fs";
import crypto4 from "crypto";
import { fileURLToPath as fileURLToPath3 } from "url";

// server/controllers/testimonialController.ts
var uploadTestimonialImage = async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "Aucune image fournie." });
    }
    const urls = files.map((f) => `/uploads/testimonials/${f.filename}`);
    res.json({ urls });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'upload des images." });
  }
};
var getTestimonials = async (req, res) => {
  try {
    const testimonials = await prisma_default.testimonial.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" }
    });
    if (testimonials.length === 0) {
      const mockTestimonials = [
        {
          id: "1",
          name: "Sarah K.",
          course: "Magistrature (Admise 2024)",
          message: "Gr\xE2ce \xE0 Excellence Acad\xE9mie, j'ai pu r\xE9ussir mon concours d\xE8s la premi\xE8re tentative. Les formateurs sont excellents.",
          rating: 5,
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        },
        {
          id: "2",
          name: "Marc A.",
          course: "ENA Cycle Moyen",
          message: "La plateforme en ligne m'a permis de r\xE9viser depuis Yamoussoukro \xE0 mon propre rythme. Je recommande vivement.",
          rating: 5,
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        },
        {
          id: "3",
          name: "Alice B.",
          course: "Greffe (Admise 2023)",
          message: "Les examens blancs r\xE9guliers font vraiment la diff\xE9rence. On arrive le jour J avec beaucoup moins de stress.",
          rating: 4,
          isActive: true,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }
      ];
      return res.json(mockTestimonials);
    }
    res.json(testimonials);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch testimonials" });
  }
};
var createTestimonial = async (req, res) => {
  try {
    const { name, course, message, rating, images } = req.body;
    if (!name || !course || !message) {
      return res.status(400).json({ error: "Nom, formation et message sont requis." });
    }
    if (message.length > 500) {
      return res.status(400).json({ error: "Le message ne peut pas d\xE9passer 500 caract\xE8res." });
    }
    const ratingValue = Math.min(5, Math.max(1, Number(rating) || 5));
    const imageUrls = Array.isArray(images) ? images.slice(0, 3) : [];
    const testimonial = await prisma_default.testimonial.create({
      data: {
        name: name.trim(),
        course: course.trim(),
        message: message.trim(),
        rating: ratingValue,
        images: imageUrls,
        isActive: false
        // Requires admin approval
      }
    });
    res.status(201).json(testimonial);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la soumission de l'avis." });
  }
};
var createTestimonialAdmin = async (req, res) => {
  try {
    const { name, course, message, rating, images, isActive } = req.body;
    if (!name || !course || !message) {
      return res.status(400).json({ error: "Nom, concours/promotion et message sont requis." });
    }
    const ratingValue = Math.min(5, Math.max(1, Number(rating) || 5));
    const imageUrls = Array.isArray(images) ? images : images ? [images] : [];
    const testimonial = await prisma_default.testimonial.create({
      data: {
        name: name.trim(),
        course: course.trim(),
        message: message.trim(),
        rating: ratingValue,
        images: imageUrls,
        isActive: isActive !== void 0 ? Boolean(isActive) : true
      }
    });
    res.status(201).json(testimonial);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la cr\xE9ation de l'admis / avis." });
  }
};
var getAllTestimonials = async (req, res) => {
  try {
    const testimonials = await prisma_default.testimonial.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json(testimonials);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch testimonials" });
  }
};
var updateTestimonial = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, course, message, rating, images, isActive } = req.body;
    const dataToUpdate = {};
    if (isActive !== void 0) dataToUpdate.isActive = Boolean(isActive);
    if (name !== void 0) dataToUpdate.name = name.trim();
    if (course !== void 0) dataToUpdate.course = course.trim();
    if (message !== void 0) dataToUpdate.message = message.trim();
    if (rating !== void 0) dataToUpdate.rating = Math.min(5, Math.max(1, Number(rating) || 5));
    if (images !== void 0) dataToUpdate.images = Array.isArray(images) ? images : images ? [images] : [];
    const testimonial = await prisma_default.testimonial.update({
      where: { id },
      data: dataToUpdate
    });
    res.json(testimonial);
  } catch (error) {
    res.status(500).json({ error: "Failed to update testimonial" });
  }
};
var deleteTestimonial = async (req, res) => {
  try {
    const id = req.params.id;
    await prisma_default.testimonial.delete({ where: { id } });
    res.json({ message: "Testimonial deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete testimonial" });
  }
};

// server/routes/testimonialRoutes.ts
var __dirname3 = path4.dirname(fileURLToPath3(import.meta.url));
var uploadsDir = path4.join(__dirname3, "..", "uploads", "testimonials");
fs3.mkdirSync(uploadsDir, { recursive: true });
var upload3 = multer3({
  storage: multer3.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path4.extname(file.originalname);
      cb(null, `${crypto4.randomUUID()}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
});
var router8 = Router8();
var testimonialUploadLimiter = rateLimit3({
  windowMs: 60 * 60 * 1e3,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop d'uploads. R\xE9essayez dans une heure." }
});
router8.get("/", getTestimonials);
router8.post("/", createTestimonial);
router8.post("/upload", authenticateToken, testimonialUploadLimiter, upload3.array("images", 3), uploadTestimonialImage);
router8.get("/admin/all", authenticateToken, requireRole(["ADMIN"]), getAllTestimonials);
router8.post("/admin", authenticateToken, requireRole(["ADMIN"]), createTestimonialAdmin);
router8.put("/:id", authenticateToken, requireRole(["ADMIN"]), updateTestimonial);
router8.delete("/:id", authenticateToken, requireRole(["ADMIN"]), deleteTestimonial);
var testimonialRoutes_default = router8;

// server/routes/courseRoutes.ts
import { Router as Router9 } from "express";

// server/controllers/courseController.ts
var asString = (value) => {
  if (Array.isArray(value)) return value[0];
  return value;
};
async function retryWithNeonWakeup2(fn, retries = 2, delayMs = 2e3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isConnectionError = err?.code === "P1001" || err?.code === "P1017" || err?.message?.includes("ECONNREFUSED") || err?.message?.includes("\u8FDE\u63A5") || err?.message?.includes("timeout");
      if (isConnectionError && attempt < retries) {
        console.warn(`\u26A0\uFE0F [Neon Wakeup] Tentative ${attempt + 1}/${retries + 1} \xE9chou\xE9e, retry dans ${delayMs}ms...`);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unreachable");
}
var getAllCourses = async (req, res) => {
  try {
    const { category } = req.query;
    const where = {};
    if (category && typeof category === "string" && category.trim() !== "") {
      where.category = category.trim();
    }
    const courses = await retryWithNeonWakeup2(
      () => prisma_default.course.findMany({
        where,
        orderBy: [{ category: "asc" }, { title: "asc" }],
        include: {
          _count: {
            select: { subscriptions: true, payments: true }
          }
        }
      })
    );
    res.json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la r\xE9cup\xE9ration des formations" });
  }
};
var createCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      category,
      registrationFee,
      registrationFeeInterieur,
      registrationFeeDiaspora,
      monthlyFee,
      monthlyFeeInterieur,
      monthlyFeeOnline,
      monthlyFeeBoth,
      monthlyFeeDiaspora,
      hasPresentiel,
      hasOnline
    } = req.body;
    if (!title) {
      return res.status(400).json({ message: "Le titre est obligatoire" });
    }
    const regFee = registrationFee !== void 0 ? Number(registrationFee) : price !== void 0 ? Number(price) : 45e3;
    const regFeeInt = registrationFeeInterieur !== void 0 ? Number(registrationFeeInterieur) : 35e3;
    const regFeeDias = registrationFeeDiaspora !== void 0 ? Number(registrationFeeDiaspora) : 1e5;
    const mFee = monthlyFee !== void 0 ? Number(monthlyFee) : 3e4;
    const mFeeInt = monthlyFeeInterieur !== void 0 ? Number(monthlyFeeInterieur) : 25e3;
    const mFeeOnline = monthlyFeeOnline !== void 0 ? Number(monthlyFeeOnline) : 25e3;
    const mFeeBoth = monthlyFeeBoth !== void 0 ? Number(monthlyFeeBoth) : 35e3;
    const mFeeDias = monthlyFeeDiaspora !== void 0 ? Number(monthlyFeeDiaspora) : 35e3;
    const course = await retryWithNeonWakeup2(
      () => prisma_default.course.create({
        data: {
          title: title.trim(),
          description: description ? description.trim() : null,
          price: regFee,
          registrationFee: regFee,
          registrationFeeInterieur: regFeeInt,
          registrationFeeDiaspora: regFeeDias,
          monthlyFee: mFee,
          monthlyFeeInterieur: mFeeInt,
          monthlyFeeOnline: mFeeOnline,
          monthlyFeeBoth: mFeeBoth,
          monthlyFeeDiaspora: mFeeDias,
          hasPresentiel: hasPresentiel !== void 0 ? Boolean(hasPresentiel) : true,
          hasOnline: hasOnline !== void 0 ? Boolean(hasOnline) : true,
          category: category && category.trim() ? category.trim() : "G\xE9n\xE9ral"
        }
      })
    );
    res.status(201).json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la cr\xE9ation de la formation" });
  }
};
var updateCourse = async (req, res) => {
  try {
    const rawId = req.params.id;
    const id = asString(rawId);
    if (!id) {
      return res.status(400).json({ message: "id de la formation requis" });
    }
    const {
      title,
      description,
      price,
      category,
      registrationFee,
      registrationFeeInterieur,
      registrationFeeDiaspora,
      monthlyFee,
      monthlyFeeInterieur,
      monthlyFeeOnline,
      monthlyFeeBoth,
      monthlyFeeDiaspora,
      hasPresentiel,
      hasOnline
    } = req.body;
    const regFee = registrationFee !== void 0 ? Number(registrationFee) : price !== void 0 ? Number(price) : void 0;
    const regFeeInt = registrationFeeInterieur !== void 0 ? Number(registrationFeeInterieur) : void 0;
    const regFeeDias = registrationFeeDiaspora !== void 0 ? Number(registrationFeeDiaspora) : void 0;
    const mFee = monthlyFee !== void 0 ? Number(monthlyFee) : void 0;
    const mFeeInt = monthlyFeeInterieur !== void 0 ? Number(monthlyFeeInterieur) : void 0;
    const mFeeOnline = monthlyFeeOnline !== void 0 ? Number(monthlyFeeOnline) : void 0;
    const mFeeBoth = monthlyFeeBoth !== void 0 ? Number(monthlyFeeBoth) : void 0;
    const mFeeDias = monthlyFeeDiaspora !== void 0 ? Number(monthlyFeeDiaspora) : void 0;
    const course = await retryWithNeonWakeup2(
      () => prisma_default.course.update({
        where: { id },
        data: {
          title: title !== void 0 ? title.trim() : void 0,
          description: description !== void 0 ? description.trim() : void 0,
          price: regFee !== void 0 ? regFee : void 0,
          registrationFee: regFee !== void 0 ? regFee : void 0,
          registrationFeeInterieur: regFeeInt !== void 0 ? regFeeInt : void 0,
          registrationFeeDiaspora: regFeeDias !== void 0 ? regFeeDias : void 0,
          monthlyFee: mFee !== void 0 ? mFee : void 0,
          monthlyFeeInterieur: mFeeInt !== void 0 ? mFeeInt : void 0,
          monthlyFeeOnline: mFeeOnline !== void 0 ? mFeeOnline : void 0,
          monthlyFeeBoth: mFeeBoth !== void 0 ? mFeeBoth : void 0,
          monthlyFeeDiaspora: mFeeDias !== void 0 ? mFeeDias : void 0,
          hasPresentiel: hasPresentiel !== void 0 ? Boolean(hasPresentiel) : void 0,
          hasOnline: hasOnline !== void 0 ? Boolean(hasOnline) : void 0,
          category: category !== void 0 ? category ? category.trim() : "G\xE9n\xE9ral" : void 0
        }
      })
    );
    res.json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la mise \xE0 jour de la formation" });
  }
};
var deleteCourse = async (req, res) => {
  try {
    const rawId = req.params.id;
    const id = asString(rawId);
    if (!id) {
      return res.status(400).json({ message: "id de la formation requis" });
    }
    await retryWithNeonWakeup2(() => prisma_default.course.delete({ where: { id } }));
    res.json({ message: "Formation supprim\xE9e avec succ\xE8s" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la suppression de la formation" });
  }
};

// server/routes/courseRoutes.ts
var router9 = Router9();
router9.get("/", getAllCourses);
router9.use(authenticateToken);
router9.post("/", requireRole(["ADMIN"]), createCourse);
router9.put("/:id", requireRole(["ADMIN"]), updateCourse);
router9.delete("/:id", requireRole(["ADMIN"]), deleteCourse);
var courseRoutes_default = router9;

// server/routes/calendarRoutes.ts
import { Router as Router10 } from "express";

// server/controllers/calendarController.ts
var getEvents = async (req, res) => {
  try {
    const { courseId, teacherId, type } = req.query;
    const where = {};
    if (courseId) where.courseId = courseId;
    if (teacherId) where.teacherId = teacherId;
    if (type) where.type = type;
    const events = await prisma_default.calendarEvent.findMany({
      where,
      include: {
        course: { select: { id: true, title: true } },
        teacher: { select: { id: true, name: true } }
      },
      orderBy: { startTime: "asc" }
    });
    res.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
};
var createEvent = async (req, res) => {
  try {
    const { title, description, startTime, endTime, location, type, color, courseId, teacherId } = req.body;
    if (!title || !startTime) {
      return res.status(400).json({ error: "Le titre et la date de d\xE9but sont requis" });
    }
    const event = await prisma_default.calendarEvent.create({
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        location,
        type: type || "COURSE",
        color,
        courseId: courseId || null,
        teacherId: teacherId || req.user.id
      }
    });
    res.status(201).json(event);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
};
var updateEvent = async (req, res) => {
  try {
    const id = req.params.id;
    const { title, description, startTime, endTime, location, type, color, courseId } = req.body;
    const event = await prisma_default.calendarEvent.update({
      where: { id },
      data: {
        ...title && { title },
        ...description !== void 0 && { description },
        ...startTime && { startTime: new Date(startTime) },
        ...endTime !== void 0 && { endTime: endTime ? new Date(endTime) : null },
        ...location !== void 0 && { location },
        ...type && { type },
        ...color !== void 0 && { color },
        ...courseId !== void 0 && { courseId: courseId || null }
      }
    });
    res.json(event);
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ error: "Failed to update event" });
  }
};
var deleteEvent = async (req, res) => {
  try {
    const id = req.params.id;
    await prisma_default.calendarEvent.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ error: "Failed to delete event" });
  }
};

// server/routes/calendarRoutes.ts
var router10 = Router10();
router10.use(authenticateToken);
router10.get("/", getEvents);
router10.post("/", requireRole(["ADMIN", "SECRETARY", "TEACHER"]), createEvent);
router10.put("/:id", requireRole(["ADMIN", "SECRETARY", "TEACHER"]), updateEvent);
router10.delete("/:id", requireRole(["ADMIN", "SECRETARY"]), deleteEvent);
var calendarRoutes_default = router10;

// server/routes/evaluationRoutes.ts
import { Router as Router11 } from "express";

// server/controllers/evaluationController.ts
var getEvaluations = async (req, res) => {
  try {
    const { studentId, courseId, teacherId } = req.query;
    const where = {};
    if (studentId) where.studentId = studentId;
    if (courseId) where.courseId = courseId;
    if (teacherId) where.teacherId = teacherId;
    const evaluations = await prisma_default.evaluation.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
        teacher: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(evaluations);
  } catch (error) {
    console.error("Error fetching evaluations:", error);
    res.status(500).json({ error: "Failed to fetch evaluations" });
  }
};
var createEvaluation = async (req, res) => {
  try {
    const { title, score, maxScore, comments, studentId, courseId } = req.body;
    if (!title || !studentId) {
      return res.status(400).json({ error: "Le titre et l'\xE9tudiant sont requis" });
    }
    const evaluation = await prisma_default.evaluation.create({
      data: {
        title,
        score: score ? Number(score) : null,
        maxScore: maxScore ? Number(maxScore) : null,
        comments,
        studentId,
        courseId: courseId || null,
        teacherId: req.user.id
      },
      include: {
        student: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } }
      }
    });
    res.status(201).json(evaluation);
  } catch (error) {
    console.error("Error creating evaluation:", error);
    res.status(500).json({ error: "Failed to create evaluation" });
  }
};
var updateEvaluation = async (req, res) => {
  try {
    const id = req.params.id;
    const { title, score, maxScore, comments } = req.body;
    const evaluation = await prisma_default.evaluation.update({
      where: { id },
      data: {
        ...title && { title },
        ...score !== void 0 && { score: Number(score) },
        ...maxScore !== void 0 && { maxScore: Number(maxScore) },
        ...comments !== void 0 && { comments }
      }
    });
    res.json(evaluation);
  } catch (error) {
    console.error("Error updating evaluation:", error);
    res.status(500).json({ error: "Failed to update evaluation" });
  }
};

// server/routes/evaluationRoutes.ts
var router11 = Router11();
router11.use(authenticateToken);
router11.get("/", requireRole(["ADMIN", "SECRETARY", "TEACHER"]), getEvaluations);
router11.post("/", requireRole(["TEACHER"]), createEvaluation);
router11.put("/:id", requireRole(["TEACHER", "ADMIN"]), updateEvaluation);
var evaluationRoutes_default = router11;

// server/routes/cityRoutes.ts
import { Router as Router12 } from "express";

// server/controllers/cityController.ts
var getCities = async (_req, res) => {
  try {
    const cities = await prisma_default.city.findMany({
      orderBy: { name: "asc" }
    });
    res.json(cities);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch cities" });
  }
};
var createCity = async (req, res) => {
  try {
    const { name, country } = req.body;
    const existing = await prisma_default.city.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: "Cette ville existe d\xE9j\xE0" });
    }
    const city = await prisma_default.city.create({
      data: { name, country: country || "C\xF4te d'Ivoire" }
    });
    res.status(201).json(city);
  } catch (error) {
    res.status(500).json({ error: "Failed to create city" });
  }
};
var updateCity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, country, isActive } = req.body;
    const data = {};
    if (name !== void 0) data.name = name;
    if (country !== void 0) data.country = country;
    if (isActive !== void 0) data.isActive = isActive;
    const city = await prisma_default.city.update({ where: { id }, data });
    res.json(city);
  } catch (error) {
    res.status(500).json({ error: "Failed to update city" });
  }
};
var deleteCity = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma_default.city.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete city" });
  }
};

// server/routes/cityRoutes.ts
var router12 = Router12();
router12.use(authenticateToken);
router12.get("/", requireRole(["ADMIN", "ACCOUNTANT"]), getCities);
router12.post("/", requireRole(["ADMIN"]), createCity);
router12.put("/:id", requireRole(["ADMIN"]), updateCity);
router12.delete("/:id", requireRole(["ADMIN"]), deleteCity);
var cityRoutes_default = router12;

// server/routes/sessionRoutes.ts
import { Router as Router13 } from "express";
import multer4 from "multer";
import rateLimit4 from "express-rate-limit";

// server/controllers/sessionController.ts
import crypto5 from "crypto";
var tablesInitialized = false;
async function ensureSessionTables() {
  if (tablesInitialized) return;
  try {
    await prisma_default.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CourseSession" (
        id TEXT PRIMARY KEY,
        "teacherId" TEXT NOT NULL REFERENCES "User"(id),
        "courseId" TEXT REFERENCES "Course"(id),
        "weekLabel" TEXT NOT NULL,
        "weekStart" TIMESTAMP NOT NULL,
        "weekEnd" TIMESTAMP NOT NULL,
        date TIMESTAMP NOT NULL,
        "startTime" TEXT NOT NULL,
        "endTime" TEXT NOT NULL,
        hours REAL NOT NULL,
        type TEXT NOT NULL DEFAULT 'PRESENTIEL',
        location TEXT,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'SCHEDULED',
        "notified" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await prisma_default.$executeRawUnsafe(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hourlyRate" REAL
    `);
    await prisma_default.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SessionFile" (
        id TEXT PRIMARY KEY,
        "sessionId" TEXT NOT NULL REFERENCES "CourseSession"(id),
        "fileName" TEXT NOT NULL,
        "fileType" TEXT NOT NULL DEFAULT 'application/octet-stream',
        "fileData" TEXT NOT NULL,
        "uploadedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    tablesInitialized = true;
  } catch (e) {
    console.warn("[SessionTables] Notice during init:", e?.message || e);
  }
}
function computeHours(startTime, endTime) {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return Math.round((eh + em / 60 - (sh + sm / 60)) * 100) / 100;
}
function getWeekInfo(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  const fmt = (dt) => dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  const label = `Semaine du ${fmt(start)} au ${fmt(end)} ${end.getFullYear()}`;
  return { weekStart: start, weekEnd: end, weekLabel: label };
}
var createSession = async (req, res) => {
  try {
    const { teacherId, courseId, date, startTime, endTime, type, location, description, notifyStudents } = req.body;
    if (!teacherId || !date || !startTime || !endTime) {
      return res.status(400).json({ error: "teacherId, date, startTime et endTime sont requis" });
    }
    const hours = computeHours(startTime, endTime);
    if (hours <= 0) {
      return res.status(400).json({ error: "L'heure de fin doit \xEAtre apr\xE8s l'heure de d\xE9but" });
    }
    const { weekStart, weekEnd, weekLabel } = getWeekInfo(date);
    const id = crypto5.randomUUID();
    const now = /* @__PURE__ */ new Date();
    const courseIdVal = courseId || null;
    const typeVal = type || "PRESENTIEL";
    const locationVal = location || null;
    const descriptionVal = description || null;
    const dateVal = new Date(date);
    await prisma_default.$executeRaw`INSERT INTO "CourseSession"
       (id, "teacherId", "courseId", "weekLabel", "weekStart", "weekEnd", date, "startTime", "endTime", hours, type, location, description, status, "notified", "createdAt", "updatedAt")
       VALUES (${id}, ${teacherId}, ${courseIdVal}, ${weekLabel}, ${weekStart}, ${weekEnd},
               ${dateVal}, ${startTime}, ${endTime}, ${hours}, ${typeVal},
               ${locationVal}, ${descriptionVal}, 'SCHEDULED', false, ${now}, ${now})`;
    const teacher = await prisma_default.user.findUnique({
      where: { id: teacherId },
      select: { id: true, name: true, email: true }
    });
    if (notifyStudents && courseId) {
      const subscriptions = await prisma_default.$queryRaw`
        SELECT u.id FROM "User" u
        INNER JOIN "Subscription" s ON u.id = s."userId"
        WHERE s."courseId" = ${courseId} AND s.status = 'ACTIVE'`;
      const typeLabel = type === "ONLINE" ? "En ligne" : "Pr\xE9sentiel";
      const dateFormatted = new Date(date).toLocaleDateString("fr-FR");
      for (const sub of subscriptions) {
        await sendNotification(
          sub.id,
          `Nouveau cours programm\xE9 : ${typeLabel}`,
          `${typeLabel} le ${dateFormatted} de ${startTime} \xE0 ${endTime}${location ? ` - ${location}` : ""}${description ? `
${description}` : ""}`
        );
      }
    }
    res.status(201).json({
      id,
      teacherId,
      courseId: courseId || null,
      weekLabel,
      weekStart,
      weekEnd,
      date: new Date(date),
      startTime,
      endTime,
      hours,
      type: type || "PRESENTIEL",
      location: location || null,
      description: description || null,
      status: "SCHEDULED",
      notified: false,
      teacher,
      createdAt: now,
      updatedAt: now
    });
  } catch (error) {
    console.error("Create session error:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
};
var getSessions = async (req, res) => {
  try {
    const { teacherId, courseId, startDate, endDate, status, groupByWeek } = req.query;
    let sql = `SELECT s.*, u.id as teacher_id, u.name as teacher_name, u.email as teacher_email,
               c.id as course_id, c.title as course_title
               FROM "CourseSession" s
               LEFT JOIN "User" u ON s."teacherId" = u.id
               LEFT JOIN "Course" c ON s."courseId" = c.id
               WHERE 1=1`;
    const params = [];
    let paramIdx = 1;
    if (teacherId) {
      sql += ` AND s."teacherId" = $${paramIdx++}`;
      params.push(teacherId);
    }
    if (courseId) {
      sql += ` AND s."courseId" = $${paramIdx++}`;
      params.push(courseId);
    }
    if (status) {
      sql += ` AND s.status = $${paramIdx++}`;
      params.push(status);
    }
    if (startDate) {
      sql += ` AND s.date >= $${paramIdx++}`;
      params.push(new Date(startDate));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      sql += ` AND s.date <= $${paramIdx++}`;
      params.push(end);
    }
    sql += ' ORDER BY s.date DESC, s."startTime" ASC';
    const rows = await prisma_default.$queryRawUnsafe(sql, ...params);
    const sessions = rows.map((r) => ({
      id: r.id,
      teacherId: r.teacherId,
      courseId: r.courseId,
      weekLabel: r.weekLabel,
      weekStart: r.weekStart,
      weekEnd: r.weekEnd,
      date: r.date,
      startTime: r.startTime,
      endTime: r.endTime,
      hours: r.hours,
      type: r.type,
      location: r.location,
      description: r.description,
      status: r.status,
      notified: r.notified,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      teacher: r.teacher_id ? { id: r.teacher_id, name: r.teacher_name, email: r.teacher_email } : null,
      course: r.course_id ? { id: r.course_id, title: r.course_title } : null
    }));
    if (groupByWeek === "true") {
      const grouped = {};
      for (const s of sessions) {
        const key = s.weekLabel;
        if (!grouped[key]) {
          grouped[key] = { weekLabel: key, weekStart: s.weekStart, weekEnd: s.weekEnd, sessions: [], totalHours: 0 };
        }
        grouped[key].sessions.push(s);
        grouped[key].totalHours += s.hours;
      }
      const weeks = Object.values(grouped).sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());
      return res.json({ weeks, total: sessions.length });
    }
    res.json(sessions);
  } catch (error) {
    console.error("Get sessions error:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
};
var updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, startTime, endTime, type, location, description, status } = req.body;
    const updates = [];
    const params = [];
    let paramIdx = 1;
    if (date !== void 0) {
      const newDate = new Date(date);
      const { weekLabel, weekStart, weekEnd } = getWeekInfo(date);
      updates.push(`date = $${paramIdx++}`);
      params.push(newDate);
      updates.push(`"weekLabel" = $${paramIdx++}`);
      params.push(weekLabel);
      updates.push(`"weekStart" = $${paramIdx++}`);
      params.push(weekStart);
      updates.push(`"weekEnd" = $${paramIdx++}`);
      params.push(weekEnd);
    }
    if (startTime !== void 0) {
      updates.push(`"startTime" = $${paramIdx++}`);
      params.push(startTime);
    }
    if (endTime !== void 0) {
      updates.push(`"endTime" = $${paramIdx++}`);
      params.push(endTime);
    }
    if (startTime !== void 0 && endTime !== void 0) {
      const hours = computeHours(startTime, endTime);
      updates.push(`hours = $${paramIdx++}`);
      params.push(hours);
    }
    if (type !== void 0) {
      updates.push(`type = $${paramIdx++}`);
      params.push(type);
    }
    if (location !== void 0) {
      updates.push(`location = $${paramIdx++}`);
      params.push(location);
    }
    if (description !== void 0) {
      updates.push(`description = $${paramIdx++}`);
      params.push(description);
    }
    if (status !== void 0) {
      updates.push(`status = $${paramIdx++}`);
      params.push(status);
    }
    updates.push(`"updatedAt" = NOW()`);
    if (updates.length === 1) {
      return res.status(400).json({ error: "No fields to update" });
    }
    params.push(id);
    await prisma_default.$executeRawUnsafe(
      `UPDATE "CourseSession" SET ${updates.join(", ")} WHERE id = $${paramIdx}`,
      ...params
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Update session error:", error);
    res.status(500).json({ error: "Failed to update session" });
  }
};
var deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma_default.$executeRaw`DELETE FROM "CourseSession" WHERE id = ${id}`;
    res.json({ success: true });
  } catch (error) {
    console.error("Delete session error:", error);
    res.status(500).json({ error: "Failed to delete session" });
  }
};
var completeSession = async (req, res) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    const rows = await prisma_default.$queryRaw`SELECT * FROM "CourseSession" WHERE id = ${id}`;
    if (!rows.length) {
      return res.status(404).json({ error: "S\xE9ance introuvable" });
    }
    const session = rows[0];
    if (session.teacherId !== teacherId) {
      return res.status(403).json({ error: "Vous ne pouvez compl\xE9ter que vos propres s\xE9ances" });
    }
    if (session.status !== "SCHEDULED") {
      return res.status(400).json({ error: "Seules les s\xE9ances planifi\xE9es peuvent \xEAtre marqu\xE9es comme termin\xE9es" });
    }
    await prisma_default.$executeRaw`UPDATE "CourseSession" SET status = 'COMPLETED', "updatedAt" = NOW() WHERE id = ${id}`;
    res.json({ success: true, status: "COMPLETED" });
  } catch (error) {
    console.error("Complete session error:", error);
    res.status(500).json({ error: "Failed to complete session" });
  }
};
var validateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await prisma_default.$queryRaw`SELECT * FROM "CourseSession" WHERE id = ${id}`;
    if (!rows.length) {
      return res.status(404).json({ error: "S\xE9ance introuvable" });
    }
    const session = rows[0];
    if (session.status !== "COMPLETED") {
      return res.status(400).json({ error: "Seules les s\xE9ances termin\xE9es peuvent \xEAtre valid\xE9es" });
    }
    await prisma_default.$executeRaw`UPDATE "CourseSession" SET status = 'VALIDATED', "updatedAt" = NOW() WHERE id = ${id}`;
    res.json({ success: true, status: "VALIDATED" });
  } catch (error) {
    console.error("Validate session error:", error);
    res.status(500).json({ error: "Failed to validate session" });
  }
};
var uploadSessionFile = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "Aucun fichier fourni" });
    }
    const rows = await prisma_default.$queryRaw`SELECT * FROM "CourseSession" WHERE id = ${id}`;
    if (!rows.length) {
      return res.status(404).json({ error: "S\xE9ance introuvable" });
    }
    const fileId = crypto5.randomUUID();
    const base64 = file.buffer.toString("base64");
    const mimeType = file.mimetype;
    await prisma_default.$executeRaw`INSERT INTO "SessionFile" (id, "sessionId", "fileName", "fileType", "fileData", "uploadedAt")
       VALUES (${fileId}, ${id}, ${file.originalname}, ${mimeType}, ${base64}, NOW())`;
    res.status(201).json({
      id: fileId,
      sessionId: id,
      fileName: file.originalname,
      fileType: mimeType
    });
  } catch (error) {
    console.error("Upload session file error:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
};
var getSessionFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await prisma_default.$queryRaw`SELECT id, "sessionId", "fileName", "fileType", "uploadedAt" FROM "SessionFile" WHERE "sessionId" = ${id} ORDER BY "uploadedAt" DESC`;
    const files = rows.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      fileName: r.fileName,
      fileType: r.fileType,
      uploadedAt: r.uploadedAt
    }));
    res.json(files);
  } catch (error) {
    console.error("Get session files error:", error);
    res.status(500).json({ error: "Failed to fetch files" });
  }
};
var downloadSessionFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const rows = await prisma_default.$queryRaw`SELECT * FROM "SessionFile" WHERE id = ${fileId}`;
    if (!rows.length) {
      return res.status(404).json({ error: "Fichier introuvable" });
    }
    const file = rows[0];
    const buffer = Buffer.from(file.fileData, "base64");
    const safeFileName = file.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 255);
    res.setHeader("Content-Type", file.fileType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFileName}"`);
    res.send(buffer);
  } catch (error) {
    console.error("Download session file error:", error);
    res.status(500).json({ error: "Failed to download file" });
  }
};
var getMonthlySalaryReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = /* @__PURE__ */ new Date();
    const m = month !== void 0 ? parseInt(month) : now.getMonth();
    const y = year !== void 0 ? parseInt(year) : now.getFullYear();
    const startDate = new Date(y, m, 1);
    const endDate = new Date(y, m + 1, 0, 23, 59, 59, 999);
    const rows = await prisma_default.$queryRaw`
      SELECT s.*, u.id as teacher_id, u.name as teacher_name, u.email as teacher_email, u."hourlyRate",
              c.id as course_id, c.title as course_title
       FROM "CourseSession" s
       LEFT JOIN "User" u ON s."teacherId" = u.id
       LEFT JOIN "Course" c ON s."courseId" = c.id
       WHERE s.date >= ${startDate} AND s.date <= ${endDate} AND (s.status = 'VALIDATED' OR s.status = 'SCHEDULED' OR s.status = 'COMPLETED')
       ORDER BY s."teacherId", s.date ASC`;
    const defaultRate = 5e3;
    const teacherMap = {};
    for (const row of rows) {
      const tid = row.teacherId;
      if (!teacherMap[tid]) {
        teacherMap[tid] = {
          teacher: { id: row.teacher_id, name: row.teacher_name, email: row.teacher_email, hourlyRate: row.hourlyRate },
          sessions: [],
          totalHours: 0,
          totalPay: 0
        };
      }
      teacherMap[tid].sessions.push({
        id: row.id,
        date: row.date,
        startTime: row.startTime,
        endTime: row.endTime,
        hours: row.hours,
        description: row.description,
        type: row.type,
        status: row.status,
        course: row.course_id ? { id: row.course_id, title: row.course_title } : null
      });
      teacherMap[tid].totalHours += row.hours;
      const rate = row.hourlyRate || defaultRate;
      teacherMap[tid].totalPay += row.hours * rate;
    }
    const report = Object.values(teacherMap).map((entry) => ({
      teacher: entry.teacher,
      sessions: entry.sessions,
      totalHours: Math.round(entry.totalHours * 100) / 100,
      totalPay: Math.round(entry.totalPay)
    }));
    const grandTotal = report.reduce((sum, r) => sum + r.totalPay, 0);
    const totalHoursAll = report.reduce((sum, r) => sum + r.totalHours, 0);
    res.json({ month: m, year: y, report, grandTotal, totalHours: totalHoursAll });
  } catch (error) {
    console.error("Monthly salary report error:", error);
    res.status(500).json({ error: "Failed to generate salary report" });
  }
};
async function processGeniusPayPayout(teacher, amount, description, phone) {
  try {
    const walletRes = await fetch(`${GENIUSPAY_API_BASE}/wallets`, {
      headers: geniusPayHeaders(),
      signal: AbortSignal.timeout(15e3)
    });
    const walletBody = await walletRes.json();
    let walletId = walletBody.data?.wallets?.[0]?.id;
    if (!walletId) {
      const createRes = await fetch(`${GENIUSPAY_API_BASE}/wallets`, {
        method: "POST",
        headers: geniusPayHeaders(),
        body: JSON.stringify({
          name: "Wallet Salaires",
          type: "payout",
          currency: "XOF"
        }),
        signal: AbortSignal.timeout(15e3)
      });
      const createBody = await createRes.json();
      walletId = createBody.data?.id;
    }
    if (!walletId) {
      return { success: false, error: "Impossible de cr\xE9er ou r\xE9cup\xE9rer un wallet GeniusPay. V\xE9rifie ton compte GeniusPay." };
    }
    const payoutRes = await fetch(`${GENIUSPAY_API_BASE}/payouts`, {
      method: "POST",
      headers: geniusPayHeaders(),
      body: JSON.stringify({
        wallet_id: walletId,
        recipient: {
          name: teacher.name || teacher.email || "",
          phone: phone.replace(/\s/g, ""),
          email: teacher.email || ""
        },
        destination: {
          type: "mobile_money",
          provider: "auto",
          account: phone.replace(/\s/g, "")
        },
        amount,
        currency: "XOF",
        description,
        metadata: { teacher_id: teacher.id, type: "salary" },
        idempotency_key: crypto5.randomUUID()
      }),
      signal: AbortSignal.timeout(15e3)
    });
    const result = await payoutRes.json();
    if (result.success) {
      return { success: true, reference: result.data?.reference || result.data?.id };
    }
    const apiMsg = result.error?.message || result.message || "Paiement GeniusPay refus\xE9";
    const env = GENIUSPAY_ENVIRONMENT;
    if (env === "sandbox") {
      return {
        success: true,
        reference: `SANDBOX-${crypto5.randomUUID().slice(0, 8)}`,
        error: `\u26A0\uFE0F Mode sandbox : paiement simul\xE9. ${apiMsg}`
      };
    }
    return { success: false, error: apiMsg };
  } catch (e) {
    const env = GENIUSPAY_ENVIRONMENT;
    if (env === "sandbox") {
      return {
        success: true,
        reference: `SANDBOX-${crypto5.randomUUID().slice(0, 8)}`,
        error: "\u26A0\uFE0F Mode sandbox : paiement simul\xE9 (API non disponible)"
      };
    }
    return { success: false, error: `Erreur r\xE9seau GeniusPay: ${e.message}` };
  }
}
var payTeacherSalary = async (req, res) => {
  try {
    const { teacherId, amount, month, year, description, paymentMethod, bonus, geniusPhone } = req.body;
    if (!teacherId || !amount) {
      return res.status(400).json({ error: "teacherId et amount sont requis" });
    }
    const teacher = await prisma_default.user.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      return res.status(404).json({ error: "Enseignant introuvable" });
    }
    const bonusAmount = bonus ? parseFloat(bonus) : 0;
    const totalAmount = parseFloat(amount) + bonusAmount;
    const descParts = [description || `Salaire ${month + 1}/${year} - ${teacher.name || teacher.email}`];
    if (bonusAmount > 0) {
      descParts.push(`Bonus: ${bonusAmount.toLocaleString("fr-FR")} FCFA`);
    }
    const fullDescription = descParts.join(" | ");
    let gpReference = null;
    if (paymentMethod === "GeniusPay") {
      if (!geniusPhone) {
        return res.status(400).json({ error: "Num\xE9ro de t\xE9l\xE9phone requis pour le paiement GeniusPay" });
      }
      const payoutResult = await processGeniusPayPayout(teacher, totalAmount, fullDescription, geniusPhone);
      if (!payoutResult.success) {
        return res.status(400).json({
          error: payoutResult.error || "\xC9chec du paiement GeniusPay",
          hint: "Utilise un autre moyen de paiement (Virement, Mobile Money...) ou v\xE9rifie la configuration GeniusPay."
        });
      }
      gpReference = payoutResult.reference || null;
      if (payoutResult.error) {
        console.warn("GeniusPay warning:", payoutResult.error);
      }
    }
    const finalDescription = gpReference ? `${fullDescription} | GeniusPay ref: ${gpReference}` : fullDescription;
    const expense = await prisma_default.expense.create({
      data: {
        amount: totalAmount,
        description: finalDescription,
        category: "SALAIRE",
        teacherId,
        paymentMethod: paymentMethod || "Virement",
        status: "PAID"
      },
      include: {
        teacher: { select: { id: true, name: true, email: true } }
      }
    });
    const m = month !== void 0 ? parseInt(month) : (/* @__PURE__ */ new Date()).getMonth();
    const y = year !== void 0 ? parseInt(year) : (/* @__PURE__ */ new Date()).getFullYear();
    const startDate = new Date(y, m, 1);
    const endDate = new Date(y, m + 1, 0, 23, 59, 59, 999);
    await prisma_default.$executeRaw`UPDATE "CourseSession" SET status = 'PAID', "updatedAt" = NOW()
       WHERE "teacherId" = ${teacherId} AND date >= ${startDate} AND date <= ${endDate} AND status IN ('VALIDATED', 'COMPLETED', 'SCHEDULED')`;
    res.status(201).json(expense);
  } catch (error) {
    console.error("Pay teacher salary error:", error);
    res.status(500).json({ error: "Failed to pay teacher salary" });
  }
};
var getStudentSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    const subscriptions = await prisma_default.$queryRaw`SELECT "courseId" FROM "Subscription" WHERE "userId" = ${userId} AND status = 'ACTIVE'`;
    const courseIds = subscriptions.map((s) => s.courseId);
    if (courseIds.length === 0) {
      return res.json({ weeks: [], total: 0 });
    }
    let sql = `SELECT s.*, u.id as teacher_id, u.name as teacher_name, u.email as teacher_email,
               c.id as course_id, c.title as course_title
               FROM "CourseSession" s
               LEFT JOIN "User" u ON s."teacherId" = u.id
               LEFT JOIN "Course" c ON s."courseId" = c.id
               WHERE s."courseId" IN (${courseIds.map((_, i) => `$${i + 1}`).join(",")}) AND s.status IN ('SCHEDULED', 'COMPLETED', 'VALIDATED')`;
    const params = [...courseIds];
    let paramIdx = courseIds.length + 1;
    if (startDate) {
      sql += ` AND s.date >= $${paramIdx++}`;
      params.push(new Date(startDate));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      sql += ` AND s.date <= $${paramIdx++}`;
      params.push(end);
    }
    sql += ' ORDER BY s.date ASC, s."startTime" ASC';
    const rows = await prisma_default.$queryRawUnsafe(sql, ...params);
    const sessions = rows.map((r) => ({
      id: r.id,
      teacherId: r.teacherId,
      courseId: r.courseId,
      weekLabel: r.weekLabel,
      weekStart: r.weekStart,
      weekEnd: r.weekEnd,
      date: r.date,
      startTime: r.startTime,
      endTime: r.endTime,
      hours: r.hours,
      type: r.type,
      location: r.location,
      description: r.description,
      status: r.status,
      teacher: r.teacher_id ? { id: r.teacher_id, name: r.teacher_name, email: r.teacher_email } : null,
      course: r.course_id ? { id: r.course_id, title: r.course_title } : null
    }));
    const grouped = {};
    for (const s of sessions) {
      const key = s.weekLabel;
      if (!grouped[key]) {
        grouped[key] = { weekLabel: key, weekStart: s.weekStart, weekEnd: s.weekEnd, sessions: [] };
      }
      grouped[key].sessions.push(s);
    }
    const weeks = Object.values(grouped).sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime());
    res.json({ weeks, total: sessions.length });
  } catch (error) {
    console.error("Get student sessions error:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
};

// server/routes/sessionRoutes.ts
var router13 = Router13();
var upload4 = multer4({ storage: multer4.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
var sessionUploadLimiter = rateLimit4({
  windowMs: 60 * 60 * 1e3,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop d'uploads de fichiers. R\xE9essayez dans une heure." }
});
router13.use(authenticateToken);
router13.get("/salary-report", requireRole(["ADMIN", "ACCOUNTANT", "SECRETARY"]), getMonthlySalaryReport);
router13.post("/pay-salary", requireRole(["ADMIN", "ACCOUNTANT"]), payTeacherSalary);
router13.get("/my-sessions", requireRole(["STUDENT"]), getStudentSessions);
router13.post("/", requireRole(["ADMIN", "ACCOUNTANT", "SECRETARY"]), createSession);
router13.get("/", requireRole(["ADMIN", "ACCOUNTANT", "SECRETARY", "TEACHER", "STUDENT"]), getSessions);
router13.put("/:id", requireRole(["ADMIN", "ACCOUNTANT", "SECRETARY"]), updateSession);
router13.delete("/:id", requireRole(["ADMIN", "ACCOUNTANT"]), deleteSession);
router13.get("/files/:fileId/download", requireRole(["STUDENT", "TEACHER", "ADMIN", "SECRETARY"]), downloadSessionFile);
router13.put("/:id/complete", requireRole(["TEACHER"]), completeSession);
router13.put("/:id/validate", requireRole(["ADMIN", "SECRETARY"]), validateSession);
router13.post("/:id/files", requireRole(["TEACHER"]), sessionUploadLimiter, upload4.single("file"), uploadSessionFile);
router13.get("/:id/files", requireRole(["STUDENT", "TEACHER", "ADMIN", "SECRETARY"]), getSessionFiles);
var sessionRoutes_default = router13;

// server/routes/subscriptionRoutes.ts
import { Router as Router14 } from "express";

// server/controllers/subscriptionController.ts
var getSubscriptionsByUser = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId requis" });
    }
    const subs = await prisma_default.subscription.findMany({
      where: { userId },
      include: { course: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" }
    });
    res.json(subs);
  } catch (error) {
    console.error("Error fetching subscriptions by user:", error);
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
};
var getMySubscriptions = async (req, res) => {
  try {
    const subs = await prisma_default.subscription.findMany({
      where: { userId: req.user.id },
      include: { course: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" }
    });
    res.json(subs);
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
};
var getOverdueItems = async (req, res) => {
  try {
    const subs = await prisma_default.subscription.findMany({
      where: { userId: req.user.id, status: "ACTIVE" },
      include: { course: { select: { id: true, title: true } } }
    });
    const now = /* @__PURE__ */ new Date();
    const allItems = [];
    for (const sub of subs) {
      const dueDate = new Date(sub.nextPayment);
      if (dueDate > now) continue;
      let cursor = new Date(dueDate);
      while (cursor <= now) {
        allItems.push({
          id: `${sub.id}-${cursor.toISOString().slice(0, 7)}`,
          subscriptionId: sub.id,
          month: cursor.toISOString().slice(0, 7),
          label: cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
          amount: sub.amount,
          courseTitle: sub.course?.title || ""
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }
    const seen = /* @__PURE__ */ new Set();
    const items = allItems.filter((item) => {
      const key = `${item.subscriptionId}-${item.month}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    res.json({ items, totalOverdue: items.reduce((s, i) => s + i.amount, 0) });
  } catch (error) {
    console.error("Error fetching overdue items:", error);
    res.status(500).json({ error: "Failed to fetch overdue items" });
  }
};
var paySubscription = async (req, res) => {
  try {
    const { subscriptionId, months, paymentMethod } = req.body;
    const nbMonths = Math.max(1, Math.min(12, parseInt(months) || 1));
    if (!subscriptionId) {
      return res.status(400).json({ error: "subscriptionId requis" });
    }
    const sub = await prisma_default.subscription.findUnique({
      where: { id: subscriptionId },
      include: { course: true, user: true }
    });
    if (!sub || sub.userId !== req.user.id) {
      return res.status(404).json({ error: "Abonnement introuvable" });
    }
    if (sub.status !== "ACTIVE") {
      return res.status(400).json({ error: "Cet abonnement n'est pas actif" });
    }
    if (sub.coursParticuliers) {
      return res.status(400).json({ error: "Les cours particuliers n'ont pas de mensualit\xE9" });
    }
    const totalAmount = sub.amount * nbMonths;
    const frontendUrl2 = process.env.FRONTEND_URL || "http://localhost:5174";
    const monthsLabel = nbMonths > 1 ? `Mensualit\xE9s x${nbMonths}` : "Mensualit\xE9";
    const geniusPayBody = {
      amount: totalAmount,
      description: `${monthsLabel}: ${sub.user.name || ""} - ${sub.course?.title || ""}`,
      customer: {
        name: sub.user.name || "",
        phone: sub.user.telephone || "",
        email: sub.user.email || ""
      },
      metadata: {
        user_id: req.user.id,
        course_id: sub.courseId,
        subscription_id: sub.id,
        months: nbMonths,
        type: "mensualite"
      },
      success_url: `${frontendUrl2}/student/dashboard`,
      error_url: `${frontendUrl2}/student/dashboard`
    };
    if (paymentMethod && METHOD_TO_GP[paymentMethod]) {
      geniusPayBody.payment_method = METHOD_TO_GP[paymentMethod];
    }
    const response = await fetch(`${GENIUSPAY_API_BASE}/payments`, {
      method: "POST",
      headers: geniusPayHeaders(),
      body: JSON.stringify(geniusPayBody),
      signal: AbortSignal.timeout(15e3)
    });
    const gpData = await handleGeniusPayResponse(response);
    if (!gpData) {
      return res.status(502).json({
        error: "Le service de paiement est temporairement indisponible. Veuillez r\xE9essayer ou contacter l'administrateur."
      });
    }
    res.status(200).json({
      success: true,
      checkoutUrl: gpData.checkout_url || gpData.payment_url,
      reference: gpData.reference
    });
  } catch (error) {
    console.error("Error paying subscription:", error);
    res.status(500).json({ error: "Erreur lors du paiement de la mensualit\xE9" });
  }
};

// server/routes/subscriptionRoutes.ts
var router14 = Router14();
router14.use(authenticateToken);
router14.get("/by-user", requireRole(["ADMIN", "ACCOUNTANT"]), getSubscriptionsByUser);
router14.get("/my-subscriptions", getMySubscriptions);
router14.get("/overdue", requireRole(["ADMIN", "ACCOUNTANT", "STUDENT"]), getOverdueItems);
router14.post("/pay", requireRole(["STUDENT"]), paySubscription);
var subscriptionRoutes_default = router14;

// server/routes/contractRoutes.ts
import { Router as Router15 } from "express";

// server/utils/contractPdf.ts
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import path5 from "path";
import fs4 from "fs";
import { fileURLToPath as fileURLToPath4 } from "url";
var __dirname4 = path5.dirname(fileURLToPath4(import.meta.url));
function base64ToBytes(base64) {
  return Buffer.from(base64, "base64");
}
async function generateSignedContractPdf(signatureDataUrl, studentName) {
  const pdfPath = path5.resolve(__dirname4, "..", "..", "public", "doc", "contrat_exacademy.pdf");
  const pdfBytes = fs4.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const base64Data = signatureDataUrl.split(",")[1];
  const signatureBytes = base64ToBytes(base64Data);
  const pngImage = await pdfDoc.embedPng(signatureBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width, height } = lastPage.getSize();
  const sigWidth = 160;
  const sigHeight = 55;
  const marginLeft = 50;
  lastPage.drawImage(pngImage, {
    x: marginLeft,
    y: 80,
    width: sigWidth,
    height: sigHeight
  });
  const dateStr = (/* @__PURE__ */ new Date()).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  const label = `Sign\xE9 \xE9lectroniquement${studentName ? ` par ${studentName}` : ""} le ${dateStr}`;
  lastPage.drawText(label, {
    x: marginLeft + 2,
    y: 150,
    size: 8,
    font,
    color: rgb(0.2, 0.2, 0.2)
  });
  const modifiedPdfBytes = await pdfDoc.save();
  return modifiedPdfBytes;
}

// server/controllers/contractController.ts
var signContract = async (req, res) => {
  try {
    const { signatureData, paymentId } = req.body;
    const userId = req.user.id;
    if (!signatureData) {
      return res.status(400).json({ error: "La signature est requise" });
    }
    const existing = await prisma_default.contract.findFirst({ where: { userId } });
    if (existing) {
      return res.status(400).json({ error: "Vous avez d\xE9j\xE0 sign\xE9 le contrat" });
    }
    const contract = await prisma_default.contract.create({
      data: {
        userId,
        paymentId: paymentId || null,
        signatureData,
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || ""
      }
    });
    try {
      const student = await prisma_default.user.findUnique({ where: { id: userId }, select: { name: true } });
      await sendNotification(userId, "Contrat de formation valid\xE9", "Votre contrat de formation a \xE9t\xE9 sign\xE9 \xE9lectroniquement avec succ\xE8s.");
      await sendNotificationToRole("ADMIN", "Nouveau contrat sign\xE9", `L'\xE9tudiant(e) ${student?.name || "Un apprenant"} a valid\xE9 et sign\xE9 son contrat de formation.`);
    } catch (e) {
      console.error("Notification error on contract signing:", e);
    }
    res.status(201).json({ success: true, contract });
  } catch (error) {
    console.error("Contract sign error:", error?.message || error);
    res.status(500).json({ error: "Erreur lors de la signature du contrat" });
  }
};
var getMyContract = async (req, res) => {
  try {
    const contract = await prisma_default.contract.findFirst({
      where: { userId: req.user.id }
    });
    res.json(contract || null);
  } catch (error) {
    console.error("Get my contract error:", error?.message || error);
    res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration du contrat" });
  }
};
var getAllContracts = async (req, res) => {
  try {
    const contracts = await prisma_default.contract.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, matricule: true, telephone: true, pays: true, ville: true } }
      },
      orderBy: { signedAt: "desc" }
    });
    res.json(contracts);
  } catch (error) {
    console.error("Get all contracts error:", error?.message || error);
    res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration des contrats" });
  }
};
var getContractByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    const contract = await prisma_default.contract.findFirst({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true, matricule: true, telephone: true, pays: true, ville: true } }
      }
    });
    if (!contract) {
      return res.status(404).json({ error: "Contrat introuvable pour cet \xE9tudiant" });
    }
    res.json(contract);
  } catch (error) {
    console.error("Get contract by user error:", error?.message || error);
    res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration du contrat" });
  }
};
var getSignedPdf = async (req, res) => {
  try {
    const contractId = req.params.id;
    const contract = await prisma_default.contract.findUnique({
      where: { id: contractId },
      include: { user: { select: { name: true } } }
    });
    if (!contract) {
      return res.status(404).json({ error: "Contrat introuvable" });
    }
    if (!contract.signatureData) {
      return res.status(400).json({ error: "Aucune signature trouv\xE9e pour ce contrat" });
    }
    const pdfBytes = await generateSignedContractPdf(contract.signatureData, contract.user?.name || void 0);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="contrat-signe-${contractId.slice(0, 8)}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error("Generate signed PDF error:", error?.message || error);
    res.status(500).json({ error: "Erreur lors de la g\xE9n\xE9ration du PDF sign\xE9" });
  }
};

// server/routes/contractRoutes.ts
var router15 = Router15();
router15.post("/sign", authenticateToken, signContract);
router15.get("/my-contract", authenticateToken, getMyContract);
router15.get("/", authenticateToken, requireRole(["ADMIN", "ACCOUNTANT", "SECRETARY"]), getAllContracts);
router15.get("/:id/signed-pdf", authenticateToken, getSignedPdf);
router15.get("/:userId", authenticateToken, requireRole(["ADMIN", "ACCOUNTANT", "SECRETARY"]), getContractByUserId);
var contractRoutes_default = router15;

// server/routes/shopRoutes.ts
import { Router as Router16 } from "express";
import multer5 from "multer";
import rateLimit5 from "express-rate-limit";
import path6 from "path";
import fs5 from "fs";
import crypto6 from "crypto";
import { fileURLToPath as fileURLToPath5 } from "url";

// server/controllers/shopController.ts
var getProducts = async (req, res) => {
  try {
    const products = await prisma_default.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
};
var getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma_default.product.findUnique({
      where: { id }
    });
    if (!product) {
      return res.status(404).json({ error: "Produit introuvable" });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch product" });
  }
};
var getAllProducts = async (req, res) => {
  try {
    const products = await prisma_default.product.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch all products" });
  }
};
var createProduct = async (req, res) => {
  try {
    const { title, description, price, originalPrice, type, imageUrl, isActive, stock } = req.body;
    const product = await prisma_default.product.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        originalPrice: originalPrice !== void 0 ? parseFloat(originalPrice) : null,
        type,
        imageUrl,
        isActive: isActive ?? true,
        stock: stock ? parseInt(stock) : null
      }
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: "Failed to create product" });
  }
};
var updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, originalPrice, type, imageUrl, isActive, stock } = req.body;
    const product = await prisma_default.product.update({
      where: { id },
      data: {
        title,
        description,
        price: price !== void 0 ? parseFloat(price) : void 0,
        originalPrice: originalPrice !== void 0 ? parseFloat(originalPrice) : void 0,
        type,
        imageUrl,
        isActive,
        stock: stock !== void 0 ? stock === null ? null : parseInt(stock) : void 0
      }
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Failed to update product" });
  }
};
var deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma_default.product.delete({ where: { id } });
    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete product" });
  }
};
var uploadProductImage = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "Aucun fichier fourni" });
    }
    const url = `/uploads/products/${file.filename}`;
    res.json({ url });
  } catch (error) {
    console.error("Upload product image error:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
};
var getOrders = async (req, res) => {
  try {
    const orders = await prisma_default.shopOrder.findMany({
      include: {
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};
var getStudentOrders = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const orders = await prisma_default.shopOrder.findMany({
      where: { userId },
      include: {
        items: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch student orders" });
  }
};
var createOrder = async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, city, adresse, whatsapp, paymentMethod, items, successUrl, errorUrl, userId } = req.body;
    if (!customerName || !customerEmail || !customerPhone || !city || !items || !items.length) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    let totalAmount = 0;
    const orderItemsData = [];
    for (const item of items) {
      const product = await prisma_default.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        return res.status(404).json({ error: `Product ${item.productId} not found` });
      }
      if (product.stock !== null && product.stock < item.quantity) {
        return res.status(400).json({ error: `Stock insuffisant pour "${product.title}" (${product.stock} disponibles)` });
      }
      totalAmount += product.price * item.quantity;
      orderItemsData.push({
        productId: product.id,
        quantity: item.quantity,
        priceAtTime: product.price
      });
    }
    const order = await prisma_default.shopOrder.create({
      data: {
        customerName,
        customerEmail,
        customerPhone,
        city,
        adresse: adresse || null,
        whatsapp: whatsapp || null,
        totalAmount,
        paymentMethod,
        userId: userId || null,
        items: {
          create: orderItemsData
        }
      }
    });
    await prisma_default.$transaction(
      items.map(
        (item) => prisma_default.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        })
      )
    );
    if (paymentMethod === "ESPECES") {
      return res.status(200).json({
        success: true,
        checkoutUrl: null,
        reference: null,
        orderId: order.id,
        message: "Commande enregistr\xE9e. Vous payerez \xE0 la livraison."
      });
    }
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const geniusPayBody = {
      amount: totalAmount,
      description: `Boutique: Commande pour ${customerName}`,
      customer: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail
      },
      metadata: {
        action: "shop_order",
        order_id: order.id
      },
      success_url: successUrl || `${baseUrl}/shop/payment/success`,
      error_url: errorUrl || `${baseUrl}/shop/payment/error`
    };
    if (paymentMethod && METHOD_TO_GP[paymentMethod]) {
      geniusPayBody.payment_method = METHOD_TO_GP[paymentMethod];
    }
    const response = await fetch(`${GENIUSPAY_API_BASE}/payments`, {
      method: "POST",
      headers: geniusPayHeaders(),
      body: JSON.stringify(geniusPayBody),
      signal: AbortSignal.timeout(15e3)
    });
    const gpData = await handleGeniusPayResponse(response);
    if (!gpData) {
      return res.status(502).json({
        error: "Le service de paiement est temporairement indisponible. Veuillez r\xE9essayer."
      });
    }
    await prisma_default.shopOrder.update({
      where: { id: order.id },
      data: { geniusPayReference: gpData.reference }
    });
    res.status(200).json({
      success: true,
      checkoutUrl: paymentMethod && METHOD_TO_GP[paymentMethod] ? gpData.payment_url || gpData.checkout_url : gpData.checkout_url || gpData.payment_url,
      reference: gpData.reference,
      orderId: order.id
    });
  } catch (error) {
    console.error("Create shop order error:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
};
var getProductReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const reviews = await prisma_default.review.findMany({
      where: { productId: id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" }
    });
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    res.json({ reviews, average: Math.round(avg * 10) / 10, count: reviews.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
};
var createReview = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Non connect\xE9" });
    const { id } = req.params;
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "La note doit \xEAtre entre 1 et 5" });
    }
    const product = await prisma_default.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: "Produit introuvable" });
    const deliveredOrder = await prisma_default.shopOrder.findFirst({
      where: {
        userId,
        status: "DELIVERED",
        items: { some: { productId: id } }
      }
    });
    if (!deliveredOrder) {
      return res.status(403).json({ error: "Vous devez avoir re\xE7u ce produit pour laisser un avis" });
    }
    const existing = await prisma_default.review.findUnique({
      where: { userId_productId: { userId, productId: id } }
    });
    if (existing) {
      return res.status(400).json({ error: "Vous avez d\xE9j\xE0 donn\xE9 un avis sur ce produit" });
    }
    const review = await prisma_default.review.create({
      data: { rating, comment, userId, productId: id, orderId: deliveredOrder.id },
      include: { user: { select: { name: true } } }
    });
    res.status(201).json(review);
  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json({ error: "Erreur lors de la cr\xE9ation de l'avis" });
  }
};
var updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await prisma_default.shopOrder.update({
      where: { id },
      data: { status }
    });
    if (status === "SHIPPED" || status === "DELIVERED" || status === "TRAITEE") {
      try {
        const escapeHtml = (str) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        const mailOptions = {
          to: order.customerEmail,
          subject: `Mise \xE0 jour de votre commande Excellence Acad\xE9mie - ${status}`,
          html: `<p>Bonjour ${escapeHtml(order.customerName || "")},</p>
                 <p>Le statut de votre commande (Ref: ${escapeHtml(order.id)}) est maintenant : <strong>${escapeHtml(status)}</strong>.</p>
                 <p>Merci pour votre achat !</p>
                 <p>L'\xE9quipe Excellence Acad\xE9mie</p>`
        };
        await sendDirectEmail(mailOptions.to, mailOptions.subject, mailOptions.html);
      } catch (err) {
        console.error("Failed to send order status email", err);
      }
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: "Failed to update order status" });
  }
};

// server/routes/shopRoutes.ts
var __dirname5 = path6.dirname(fileURLToPath5(import.meta.url));
var uploadsDir2 = path6.join(__dirname5, "..", "uploads", "products");
fs5.mkdirSync(uploadsDir2, { recursive: true });
var upload5 = multer5({
  storage: multer5.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir2),
    filename: (_req, file, cb) => {
      const ext = path6.extname(file.originalname).toLowerCase();
      cb(null, `${crypto6.randomUUID()}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Format invalide. Seules les images (JPEG, PNG, WebP, GIF) sont autoris\xE9es."));
    }
  }
});
var router16 = Router16();
var uploadLimiter = rateLimit5({
  windowMs: 60 * 60 * 1e3,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop d'uploads. R\xE9essayez dans une heure." }
});
router16.get("/products", getProducts);
router16.get("/products/:id", getProductById);
router16.post("/orders", createOrder);
router16.get("/products/:id/reviews", getProductReviews);
router16.post("/products/:id/reviews", authenticateToken, createReview);
router16.get("/my-orders", authenticateToken, getStudentOrders);
router16.get("/admin/products", authenticateToken, requireRole(["ADMIN", "SECRETARY"]), getAllProducts);
router16.post("/admin/products/upload", authenticateToken, requireRole(["ADMIN", "SECRETARY"]), uploadLimiter, upload5.single("image"), uploadProductImage);
router16.post("/admin/products", authenticateToken, requireRole(["ADMIN", "SECRETARY"]), createProduct);
router16.put("/admin/products/:id", authenticateToken, requireRole(["ADMIN", "SECRETARY"]), updateProduct);
router16.delete("/admin/products/:id", authenticateToken, requireRole(["ADMIN", "SECRETARY"]), deleteProduct);
router16.get("/admin/orders", authenticateToken, requireRole(["ADMIN", "SECRETARY"]), getOrders);
router16.put("/admin/orders/:id/status", authenticateToken, requireRole(["ADMIN", "SECRETARY"]), updateOrderStatus);
var shopRoutes_default = router16;

// server/routes/bannerRoutes.ts
import { Router as Router17 } from "express";

// server/controllers/bannerController.ts
var isProduction = process.env.NODE_ENV === "production";
var safeError = (err) => isProduction ? void 0 : err?.message;
var getActiveBanners = async (req, res) => {
  try {
    const now = /* @__PURE__ */ new Date();
    const banners = await prisma_default.shopBanner.findMany({
      where: {
        isActive: true,
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: now }, endDate: null },
          { startDate: null, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: { gte: now } }
        ]
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            originalPrice: true,
            imageUrl: true,
            type: true
          }
        }
      },
      orderBy: {
        displayOrder: "asc"
      }
    });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du chargement des banni\xE8res", error: safeError(error) });
  }
};
var getAllBanners = async (req, res) => {
  try {
    const banners = await prisma_default.shopBanner.findMany({
      include: {
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            originalPrice: true,
            imageUrl: true,
            type: true
          }
        }
      },
      orderBy: {
        displayOrder: "asc"
      }
    });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du chargement des banni\xE8res", error: safeError(error) });
  }
};
var getBannerById = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await prisma_default.shopBanner.findUnique({
      where: { id },
      include: {
        product: true
      }
    });
    if (!banner) return res.status(404).json({ message: "Banni\xE8re non trouv\xE9e" });
    res.json(banner);
  } catch (error) {
    res.status(500).json({ message: "Erreur", error: safeError(error) });
  }
};
var createBanner = async (req, res) => {
  try {
    const { title, subtitle, description, imageUrl, backgroundColor, badgeText, featured, displayOrder, isActive, productId, startDate, endDate } = req.body;
    if (!title) return res.status(400).json({ message: "Le titre est requis" });
    const banner = await prisma_default.shopBanner.create({
      data: {
        title,
        subtitle,
        description,
        imageUrl,
        backgroundColor: backgroundColor || "from-[#FF6B00] to-[#e65c00]",
        badgeText: badgeText || "Promotion",
        featured: featured || false,
        displayOrder: displayOrder || 0,
        isActive: isActive !== void 0 ? isActive : true,
        productId: productId || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      },
      include: {
        product: true
      }
    });
    res.status(201).json(banner);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la cr\xE9ation", error: safeError(error) });
  }
};
var updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, description, imageUrl, backgroundColor, badgeText, featured, displayOrder, isActive, productId, startDate, endDate } = req.body;
    const banner = await prisma_default.shopBanner.update({
      where: { id },
      data: {
        title: title !== void 0 ? title : void 0,
        subtitle: subtitle !== void 0 ? subtitle : void 0,
        description: description !== void 0 ? description : void 0,
        imageUrl: imageUrl !== void 0 ? imageUrl : void 0,
        backgroundColor: backgroundColor !== void 0 ? backgroundColor : void 0,
        badgeText: badgeText !== void 0 ? badgeText : void 0,
        featured: featured !== void 0 ? featured : void 0,
        displayOrder: displayOrder !== void 0 ? displayOrder : void 0,
        isActive: isActive !== void 0 ? isActive : void 0,
        productId: productId !== void 0 ? productId : void 0,
        startDate: startDate !== void 0 ? startDate ? new Date(startDate) : null : void 0,
        endDate: endDate !== void 0 ? endDate ? new Date(endDate) : null : void 0
      },
      include: {
        product: true
      }
    });
    res.json(banner);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise \xE0 jour", error: safeError(error) });
  }
};
var deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma_default.shopBanner.delete({
      where: { id }
    });
    res.json({ message: "Banni\xE8re supprim\xE9e avec succ\xE8s" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression", error: safeError(error) });
  }
};

// server/routes/bannerRoutes.ts
var router17 = Router17();
router17.get("/public", getActiveBanners);
router17.get("/", authenticateToken, requireRole(["ADMIN"]), getAllBanners);
router17.get("/:id", authenticateToken, requireRole(["ADMIN"]), getBannerById);
router17.post("/", authenticateToken, requireRole(["ADMIN"]), createBanner);
router17.put("/:id", authenticateToken, requireRole(["ADMIN"]), updateBanner);
router17.delete("/:id", authenticateToken, requireRole(["ADMIN"]), deleteBanner);
var bannerRoutes_default = router17;

// server/routes/blogRoutes.ts
import { Router as Router18 } from "express";
import multer6 from "multer";
import path7 from "path";
import fs6 from "fs";
import crypto7 from "crypto";
import { fileURLToPath as fileURLToPath6 } from "url";

// server/controllers/blogController.ts
var asString2 = (value) => {
  if (Array.isArray(value)) return value[0];
  return value;
};
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
var getBlogPosts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(asString2(req.query.page) || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(asString2(req.query.limit) || "12")));
    const skip = (page - 1) * limit;
    const courseId = asString2(req.query.courseId);
    const authorId = asString2(req.query.authorId);
    const tag = asString2(req.query.tag);
    const where = {};
    if (courseId) where.courseId = courseId;
    if (authorId) where.authorId = authorId;
    if (tag) where.tags = { some: { tag: { name: tag } } };
    const [posts, total] = await Promise.all([
      prisma_default.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, name: true, image: true } },
          course: { select: { id: true, title: true } },
          tags: { include: { tag: true } }
        }
      }),
      prisma_default.blogPost.count({ where })
    ]);
    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        const [commentCount, exerciseCount] = await Promise.all([
          prisma_default.blogComment.count({ where: { postId: post.id } }),
          prisma_default.blogExercise.count({ where: { postId: post.id } })
        ]);
        return { ...post, _count: { comments: commentCount, exercises: exerciseCount } };
      })
    );
    res.json({ posts: postsWithCounts, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la r\xE9cup\xE9ration des articles" });
  }
};
var getBlogPostBySlug = async (req, res) => {
  try {
    const post = await prisma_default.blogPost.findUnique({
      where: { slug: req.params.slug },
      include: {
        author: { select: { id: true, name: true, image: true } },
        course: { select: { id: true, title: true } },
        tags: { include: { tag: true } },
        comments: {
          orderBy: { createdAt: "desc" },
          include: { author: { select: { id: true, name: true, image: true } } }
        },
        exercises: {
          include: {}
        }
      }
    });
    if (!post) return res.status(404).json({ message: "Article non trouv\xE9" });
    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la r\xE9cup\xE9ration de l'article" });
  }
};
var createBlogPost = async (req, res) => {
  try {
    const { title, content, excerpt, coverImage, published, courseId, tags } = req.body;
    if (!title || !content) return res.status(400).json({ message: "Titre et contenu obligatoires" });
    let slug = slugify(title);
    const existing = await prisma_default.blogPost.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;
    const post = await prisma_default.blogPost.create({
      data: {
        slug,
        title,
        content,
        excerpt,
        coverImage,
        published: published ?? true,
        authorId: req.user.id,
        courseId: courseId || void 0,
        tags: tags?.length ? {
          create: tags.map((name) => ({
            tag: { connectOrCreate: { where: { name }, create: { name } } }
          }))
        } : void 0
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
        tags: { include: { tag: true } }
      }
    });
    res.status(201).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la cr\xE9ation de l'article" });
  }
};
var updateBlogPost = async (req, res) => {
  try {
    const { title, content, excerpt, coverImage, published, courseId, tags } = req.body;
    const id = req.params.id;
    const existing = await prisma_default.blogPost.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Article non trouv\xE9" });
    const data = {};
    if (title !== void 0) {
      data.title = title;
      data.slug = slugify(title);
      const slugExists = await prisma_default.blogPost.findUnique({ where: { slug: data.slug } });
      if (slugExists && slugExists.id !== id) data.slug = `${data.slug}-${Date.now()}`;
    }
    if (content !== void 0) data.content = content;
    if (excerpt !== void 0) data.excerpt = excerpt;
    if (coverImage !== void 0) data.coverImage = coverImage;
    if (published !== void 0) data.published = published;
    if (courseId !== void 0) data.courseId = courseId || null;
    if (tags !== void 0) {
      await prisma_default.blogPostTag.deleteMany({ where: { postId: id } });
      if (tags.length) {
        await prisma_default.blogPostTag.createMany({
          data: await Promise.all(tags.map(async (name) => {
            const tag = await prisma_default.blogTag.upsert({ where: { name }, update: {}, create: { name } });
            return { postId: id, tagId: tag.id };
          }))
        });
      }
    }
    const post = await prisma_default.blogPost.update({
      where: { id },
      data,
      include: {
        author: { select: { id: true, name: true, image: true } },
        course: { select: { id: true, title: true } },
        tags: { include: { tag: true } }
      }
    });
    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la mise \xE0 jour de l'article" });
  }
};
var deleteBlogPost = async (req, res) => {
  try {
    const id = req.params.id;
    await prisma_default.blogPost.delete({ where: { id } });
    res.json({ message: "Article supprim\xE9 avec succ\xE8s" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la suppression de l'article" });
  }
};
var uploadPostAttachment = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Fichier requis" });
    const url = `/uploads/blog/${req.file.filename}`;
    res.json({ url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de l'upload" });
  }
};
var getComments = async (req, res) => {
  try {
    const comments = await prisma_default.blogComment.findMany({
      where: { postId: req.params.postId },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { id: true, name: true, image: true } } }
    });
    res.json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la r\xE9cup\xE9ration des commentaires" });
  }
};
var createComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: "Contenu obligatoire" });
    const comment = await prisma_default.blogComment.create({
      data: { content, authorId: req.user.id, postId: req.params.postId },
      include: { author: { select: { id: true, name: true, image: true } } }
    });
    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la cr\xE9ation du commentaire" });
  }
};
var deleteComment = async (req, res) => {
  try {
    const comment = await prisma_default.blogComment.findUnique({ where: { id: req.params.id } });
    if (!comment) return res.status(404).json({ message: "Commentaire non trouv\xE9" });
    if (comment.authorId !== req.user.id && !["ADMIN", "TEACHER", "SECRETARY"].includes(req.user.role)) {
      return res.status(403).json({ message: "Non autoris\xE9" });
    }
    await prisma_default.blogComment.delete({ where: { id: req.params.id } });
    res.json({ message: "Commentaire supprim\xE9" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
};
var createExercise = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ message: "Titre obligatoire" });
    const exercise = await prisma_default.blogExercise.create({
      data: { title, description, postId: req.params.postId }
    });
    res.status(201).json(exercise);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la cr\xE9ation de l'exercice" });
  }
};
var updateExercise = async (req, res) => {
  try {
    const { title, description } = req.body;
    const exercise = await prisma_default.blogExercise.update({
      where: { id: req.params.id },
      data: { title, description }
    });
    res.json(exercise);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la mise \xE0 jour" });
  }
};
var deleteExercise = async (req, res) => {
  try {
    await prisma_default.blogExercise.delete({ where: { id: req.params.id } });
    res.json({ message: "Exercice supprim\xE9" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
};
var uploadExerciseAttachment = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Fichier requis" });
    const url = `/uploads/blog/${req.file.filename}`;
    await prisma_default.blogExercise.update({ where: { id: req.params.id }, data: { fileUrl: url } });
    res.json({ url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de l'upload" });
  }
};
var submitExercise = async (req, res) => {
  try {
    const { content } = req.body;
    const exerciseId = req.params.id;
    const studentId = req.user.id;
    const fileUrl = req.file ? `/uploads/blog/${req.file.filename}` : void 0;
    const existing = await prisma_default.blogSubmission.findUnique({
      where: { exerciseId_studentId: { exerciseId, studentId } }
    });
    if (existing) return res.status(400).json({ message: "Vous avez d\xE9j\xE0 soumis pour cet exercice" });
    const submission = await prisma_default.blogSubmission.create({
      data: { content, fileUrl, studentId, exerciseId },
      include: { student: { select: { id: true, name: true } } }
    });
    res.status(201).json(submission);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la soumission" });
  }
};
var getSubmissions = async (req, res) => {
  try {
    const exerciseId = req.params.id;
    const exercise = await prisma_default.blogExercise.findUnique({
      where: { id: exerciseId },
      select: { post: { select: { authorId: true } } }
    });
    if (!exercise) return res.status(404).json({ message: "Exercice non trouv\xE9" });
    if (exercise.post.authorId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Non autoris\xE9" });
    }
    const submissions = await prisma_default.blogSubmission.findMany({
      where: { exerciseId },
      include: { student: { select: { id: true, name: true, image: true, email: true } } },
      orderBy: { createdAt: "desc" }
    });
    res.json(submissions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la r\xE9cup\xE9ration" });
  }
};
var evaluateSubmission = async (req, res) => {
  try {
    const { grade, feedback } = req.body;
    const submission = await prisma_default.blogSubmission.findUnique({
      where: { id: req.params.id },
      include: { exercise: { include: { post: true } } }
    });
    if (!submission) return res.status(404).json({ message: "Soumission non trouv\xE9e" });
    if (submission.exercise.post.authorId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Non autoris\xE9" });
    }
    const updated = await prisma_default.blogSubmission.update({
      where: { id: req.params.id },
      data: { grade: grade !== void 0 ? Number(grade) : void 0, feedback },
      include: { student: { select: { id: true, name: true } } }
    });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de l'\xE9valuation" });
  }
};

// server/routes/blogRoutes.ts
var __dirname6 = path7.dirname(fileURLToPath6(import.meta.url));
var blogUploadsDir = path7.join(__dirname6, "..", "uploads", "blog");
fs6.mkdirSync(blogUploadsDir, { recursive: true });
var upload6 = multer6({
  storage: multer6.diskStorage({
    destination: (_req, _file, cb) => cb(null, blogUploadsDir),
    filename: (_req, file, cb) => {
      const ext = path7.extname(file.originalname);
      cb(null, `${crypto7.randomUUID()}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Seuls les images et PDF sont autoris\xE9s"));
    }
  }
});
var router18 = Router18();
router18.get("/", getBlogPosts);
router18.get("/:slug", getBlogPostBySlug);
router18.use(authenticateToken);
router18.post("/", requireRole(["ADMIN", "TEACHER", "SECRETARY"]), createBlogPost);
router18.put("/:id", requireRole(["ADMIN", "TEACHER", "SECRETARY"]), updateBlogPost);
router18.delete("/:id", requireRole(["ADMIN", "TEACHER", "SECRETARY"]), deleteBlogPost);
router18.post("/:id/attachments", requireRole(["ADMIN", "TEACHER", "SECRETARY"]), upload6.single("file"), uploadPostAttachment);
router18.get("/:postId/comments", getComments);
router18.post("/:postId/comments", requireRole(["ADMIN", "TEACHER", "SECRETARY", "STUDENT"]), createComment);
router18.delete("/comments/:id", requireRole(["ADMIN", "TEACHER", "SECRETARY"]), deleteComment);
router18.post("/:postId/exercises", requireRole(["ADMIN", "TEACHER", "SECRETARY"]), createExercise);
router18.put("/exercises/:id", requireRole(["ADMIN", "TEACHER", "SECRETARY"]), updateExercise);
router18.delete("/exercises/:id", requireRole(["ADMIN", "TEACHER", "SECRETARY"]), deleteExercise);
router18.post("/exercises/:id/attachments", requireRole(["ADMIN", "TEACHER", "SECRETARY"]), upload6.single("file"), uploadExerciseAttachment);
router18.post("/exercises/:id/submit", requireRole(["STUDENT"]), upload6.single("file"), submitExercise);
router18.get("/exercises/:id/submissions", requireRole(["ADMIN", "TEACHER", "SECRETARY"]), getSubmissions);
router18.put("/submissions/:id/evaluate", requireRole(["ADMIN", "TEACHER", "SECRETARY"]), evaluateSubmission);
var blogRoutes_default = router18;

// server/routes/siteConfigRoutes.ts
import { Router as Router19 } from "express";

// server/controllers/siteConfigController.ts
var CONFIG_KEY = "home";
var MAX_SIZE = 200 * 1024;
var isProduction2 = process.env.NODE_ENV === "production";
var safeError2 = (err) => isProduction2 ? void 0 : err?.message;
function parseContent(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
async function getRow() {
  let row = await prisma_default.siteConfig.findUnique({ where: { key: CONFIG_KEY } });
  if (!row) {
    row = await prisma_default.siteConfig.upsert({
      where: { key: CONFIG_KEY },
      update: {},
      create: { key: CONFIG_KEY, content: "{}" }
    });
  }
  return row;
}
var getPublicConfig = async (_req, res) => {
  try {
    const row = await getRow();
    res.json(parseContent(row.content));
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du chargement de la configuration", error: safeError2(error) });
  }
};
var getConfig = async (_req, res) => {
  try {
    const row = await getRow();
    res.json({ key: row.key, content: parseContent(row.content), updatedAt: row.updatedAt });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du chargement de la configuration", error: safeError2(error) });
  }
};
var updateConfig = async (req, res) => {
  try {
    const content = req.body?.content;
    if (content === void 0) {
      return res.status(400).json({ message: 'Le champ "content" est obligatoire' });
    }
    if (typeof content !== "object" || content === null || Array.isArray(content)) {
      return res.status(400).json({ message: '"content" doit \xEAtre un objet JSON' });
    }
    const serialized = JSON.stringify(content);
    if (serialized.length > MAX_SIZE) {
      return res.status(400).json({ message: "Configuration trop volumineuse" });
    }
    const row = await prisma_default.siteConfig.upsert({
      where: { key: CONFIG_KEY },
      update: { content: serialized },
      create: { key: CONFIG_KEY, content: serialized }
    });
    res.json({ key: row.key, content: parseContent(row.content), updatedAt: row.updatedAt });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la sauvegarde de la configuration", error: safeError2(error) });
  }
};

// server/routes/siteConfigRoutes.ts
var router19 = Router19();
router19.get("/public", getPublicConfig);
router19.get("/", authenticateToken, requireRole(["ADMIN"]), getConfig);
router19.put("/", authenticateToken, requireRole(["ADMIN"]), updateConfig);
var siteConfigRoutes_default = router19;

// server/routes/categoryRoutes.ts
import { Router as Router20 } from "express";

// server/controllers/categoryController.ts
var DEFAULT_PRESETS = [
  { name: "Concours Juridiques & Judiciaires", description: "Magistrature, Greffe, Avocature, Notariat", color: "#D97706", displayOrder: 1 },
  { name: "Administration Publique", description: "ENA, Fonction Publique, EPPJEJ & EPP", color: "#c97e00", displayOrder: 2 },
  { name: "S\xE9curit\xE9 & Force Publique", description: "Officiers, Sous-Officiers de Police, Gendarmerie, Agent p\xE9nitentiaire", color: "#D97706", displayOrder: 3 },
  { name: "Technologies & M\xE9tiers Num\xE9riques", description: "Informatique, Cybers\xE9curit\xE9, R\xE9seaux", color: "#1e9e54", displayOrder: 4 },
  { name: "Sant\xE9 & Param\xE9dical", description: "Concours INFAS", color: "#DC2626", displayOrder: 5 },
  { name: "\xC9ducation & Enseignement", description: "CAFOP, ENS, Enseignement secondaire", color: "#1e9e54", displayOrder: 6 },
  { name: "Finances & Gestion", description: "Tr\xE9sor, Imp\xF4ts, Douanes, Comptabilit\xE9 publique", color: "#059669", displayOrder: 7 }
];
var categoryTableReady = null;
async function isCategoryTableReady() {
  if (categoryTableReady !== null) return categoryTableReady;
  try {
    await prisma_default.$queryRaw`SELECT 1 FROM "Category" LIMIT 1`;
    categoryTableReady = true;
  } catch {
    categoryTableReady = false;
  }
  return categoryTableReady;
}
var ensureCategoryTable = async () => {
  try {
    await prisma_default.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Category" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "color" TEXT DEFAULT '#c97e00',
        "displayOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma_default.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name")`);
    categoryTableReady = true;
    console.log("\u2705 Table Category v\xE9rifi\xE9e/cr\xE9\xE9e");
  } catch (err) {
    console.warn("\u26A0\uFE0F Impossible de cr\xE9er la table Category:", err);
    categoryTableReady = false;
  }
};
async function ensureDefaultCategories() {
  const tableReady = await isCategoryTableReady();
  if (!tableReady) return;
  try {
    const count = await prisma_default.category.count();
    if (count === 0) {
      for (const preset of DEFAULT_PRESETS) {
        await prisma_default.category.upsert({
          where: { name: preset.name },
          update: {},
          create: preset
        });
      }
      console.log("\u2705 Cat\xE9gories par d\xE9faut initialis\xE9es en base");
    }
  } catch (err) {
    console.warn("\u26A0\uFE0F Erreur init cat\xE9gories par d\xE9faut:", err);
  }
}
var getAllCategories = async (req, res) => {
  try {
    const tableReady = await isCategoryTableReady();
    if (!tableReady) {
      return res.json(DEFAULT_PRESETS.map((c, i) => ({ ...c, id: `preset-${i}`, coursesCount: 0 })));
    }
    await ensureDefaultCategories();
    const categories = await prisma_default.category.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }]
    });
    const counts = {};
    try {
      const courses = await prisma_default.course.findMany({ select: { category: true } });
      for (const c of courses) {
        const catName = c.category?.trim();
        if (catName) {
          counts[catName] = (counts[catName] || 0) + 1;
        }
      }
    } catch (dbErr) {
      console.warn("\u26A0\uFE0F Impossible de compter les cours en base :", dbErr);
    }
    const result = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      color: cat.color,
      displayOrder: cat.displayOrder,
      coursesCount: counts[cat.name] || 0
    }));
    res.json(result);
  } catch (error) {
    console.error("Erreur getAllCategories :", error);
    res.json(DEFAULT_PRESETS.map((c, i) => ({ ...c, id: `preset-${i}`, coursesCount: 0 })));
  }
};
var createCategory = async (req, res) => {
  try {
    const tableReady = await isCategoryTableReady();
    if (!tableReady) {
      return res.status(503).json({ message: "La table Category n'est pas encore disponible. R\xE9essayez dans quelques instants." });
    }
    const { name, description, color, displayOrder } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Le nom de la cat\xE9gorie est obligatoire" });
    }
    const trimmedName = name.trim();
    const existing = await prisma_default.category.findUnique({ where: { name: trimmedName } });
    if (existing) {
      return res.status(400).json({ message: "Une cat\xE9gorie avec ce nom existe d\xE9j\xE0" });
    }
    const count = await prisma_default.category.count();
    const newCategory = await prisma_default.category.create({
      data: {
        name: trimmedName,
        description: description?.trim() || null,
        color: color?.trim() || "#c97e00",
        displayOrder: Number(displayOrder) || count + 1
      }
    });
    res.status(201).json({ ...newCategory, coursesCount: 0 });
  } catch (error) {
    console.error("Erreur createCategory :", error);
    res.status(500).json({ message: "Erreur lors de la cr\xE9ation de la cat\xE9gorie" });
  }
};
var updateCategory = async (req, res) => {
  try {
    const tableReady = await isCategoryTableReady();
    if (!tableReady) {
      return res.status(503).json({ message: "La table Category n'est pas encore disponible." });
    }
    const { id } = req.params;
    const { name, description, color, displayOrder } = req.body;
    const existing = await prisma_default.category.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Cat\xE9gorie introuvable" });
    }
    const oldName = existing.name;
    const newName = name !== void 0 ? name.trim() : oldName;
    if (newName.toLowerCase() !== oldName.toLowerCase()) {
      const duplicate = await prisma_default.category.findFirst({
        where: { id: { not: id }, name: { equals: newName, mode: "insensitive" } }
      });
      if (duplicate) {
        return res.status(400).json({ message: "Ce nom de cat\xE9gorie est d\xE9j\xE0 utilis\xE9" });
      }
      try {
        await prisma_default.course.updateMany({
          where: { category: oldName },
          data: { category: newName }
        });
      } catch (dbErr) {
        console.warn("\u26A0\uFE0F Erreur mise \xE0 jour des cours associ\xE9s :", dbErr);
      }
    }
    const updatedCategory = await prisma_default.category.update({
      where: { id },
      data: {
        name: newName,
        description: description !== void 0 ? description?.trim() || null : void 0,
        color: color !== void 0 ? color?.trim() || "#c97e00" : void 0,
        displayOrder: displayOrder !== void 0 ? Number(displayOrder) : void 0
      }
    });
    res.json(updatedCategory);
  } catch (error) {
    console.error("Erreur updateCategory :", error);
    res.status(500).json({ message: "Erreur lors de la modification de la cat\xE9gorie" });
  }
};
var deleteCategory = async (req, res) => {
  try {
    const tableReady = await isCategoryTableReady();
    if (!tableReady) {
      return res.status(503).json({ message: "La table Category n'est pas encore disponible." });
    }
    const { id } = req.params;
    const existing = await prisma_default.category.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Cat\xE9gorie introuvable" });
    }
    try {
      await prisma_default.course.updateMany({
        where: { category: existing.name },
        data: { category: "G\xE9n\xE9ral" }
      });
    } catch (dbErr) {
      console.warn("\u26A0\uFE0F Erreur mise \xE0 jour des cours supprim\xE9s :", dbErr);
    }
    await prisma_default.category.delete({ where: { id } });
    res.json({ message: "Cat\xE9gorie supprim\xE9e avec succ\xE8s" });
  } catch (error) {
    console.error("Erreur deleteCategory :", error);
    res.status(500).json({ message: "Erreur lors de la suppression de la cat\xE9gorie" });
  }
};

// server/routes/categoryRoutes.ts
var router20 = Router20();
router20.get("/", getAllCategories);
router20.use(authenticateToken);
router20.post("/", requireRole(["ADMIN"]), createCategory);
router20.put("/:id", requireRole(["ADMIN"]), updateCategory);
router20.delete("/:id", requireRole(["ADMIN"]), deleteCategory);
var categoryRoutes_default = router20;

// server/routes/pushRoutes.ts
import { Router as Router21 } from "express";
var router21 = Router21();
router21.get("/vapid-key", (_req, res) => {
  res.json({ publicKey: getVapidPublicKey(), enabled: isPushEnabled() });
});
router21.post("/subscribe", authenticateToken, async (req, res) => {
  try {
    const { subscription, userAgent } = req.body;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ error: "Subscription invalide" });
    }
    await savePushSubscription(req.user.id, {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth
    }, userAgent || navigator?.userAgent);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router21.post("/unsubscribe", authenticateToken, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: "Endpoint requis" });
    await removePushSubscription(endpoint);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var pushRoutes_default = router21;

// server/routes/appSettingsRoutes.ts
import { Router as Router22 } from "express";

// server/controllers/appSettingsController.ts
var getAppSettings = async (_req, res) => {
  try {
    let settings = await prisma_default.appSettings.findUnique({ where: { key: "global" } });
    if (!settings) {
      settings = await prisma_default.appSettings.create({
        data: { key: "global", additionalCourseAmount: 1e4 }
      });
    }
    res.json(settings);
  } catch (error) {
    console.error("getAppSettings error:", error);
    res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration des param\xE8tres" });
  }
};
var updateAppSettings = async (req, res) => {
  try {
    const { additionalCourseAmount } = req.body;
    if (additionalCourseAmount !== void 0 && (isNaN(Number(additionalCourseAmount)) || Number(additionalCourseAmount) < 0)) {
      return res.status(400).json({ error: "Le montant doit \xEAtre un nombre positif" });
    }
    const data = {};
    if (additionalCourseAmount !== void 0) data.additionalCourseAmount = Number(additionalCourseAmount);
    const settings = await prisma_default.appSettings.upsert({
      where: { key: "global" },
      update: data,
      create: { key: "global", additionalCourseAmount: data.additionalCourseAmount ?? 1e4 }
    });
    res.json(settings);
  } catch (error) {
    console.error("updateAppSettings error:", error);
    res.status(500).json({ error: "Erreur lors de la mise \xE0 jour des param\xE8tres" });
  }
};

// server/routes/appSettingsRoutes.ts
var router22 = Router22();
router22.get("/", getAppSettings);
router22.use(authenticateToken);
router22.put("/", requireRole(["ADMIN"]), updateAppSettings);
var appSettingsRoutes_default = router22;

// server/seed-courses.ts
var DEFAULT_FORMATIONS = [
  {
    title: "Magistrature",
    category: "Concours Juridiques & Judiciaires",
    price: 35e3,
    registrationFee: 35e3,
    monthlyFee: 3e4,
    hasPresentiel: true,
    hasOnline: true,
    description: "Pr\xE9paration intensive d'excellence au concours direct et professionnel de la Magistrature"
  },
  {
    title: "Greffe",
    category: "Concours Juridiques & Judiciaires",
    price: 35e3,
    registrationFee: 35e3,
    monthlyFee: 3e4,
    hasPresentiel: true,
    hasOnline: true,
    description: "Pr\xE9paration compl\xE8te aux concours des greffiers et administrateurs des greffes"
  },
  {
    title: "Avocature & Notariat",
    category: "Concours Juridiques & Judiciaires",
    price: 35e3,
    registrationFee: 35e3,
    monthlyFee: 3e4,
    hasPresentiel: true,
    hasOnline: true,
    description: "Pr\xE9paration au certificat d'aptitude (CAPA) et concours de notariat"
  },
  {
    title: "ENA (Tous cycles)",
    category: "Administration Publique",
    price: 35e3,
    registrationFee: 35e3,
    monthlyFee: 3e4,
    hasPresentiel: true,
    hasOnline: true,
    description: "Pr\xE9paration aux cycles Moyen, Moyen Sup\xE9rieur et Sup\xE9rieur de l'ENA"
  },
  {
    title: "Fonction Publique",
    category: "Administration Publique",
    price: 35e3,
    registrationFee: 35e3,
    monthlyFee: 3e4,
    hasPresentiel: true,
    hasOnline: true,
    description: "Concours directs et professionnels de la Fonction Publique"
  },
  {
    title: "EPPJEJ & EPP",
    category: "Administration Publique",
    price: 35e3,
    registrationFee: 35e3,
    monthlyFee: 3e4,
    hasPresentiel: true,
    hasOnline: true,
    description: "Protection judiciaire de l'enfance, de la jeunesse et \xE9ducateurs"
  },
  {
    title: "Agent p\xE9nitentiaire",
    category: "S\xE9curit\xE9 & Force Publique",
    price: 35e3,
    registrationFee: 35e3,
    monthlyFee: 3e4,
    hasPresentiel: true,
    hasOnline: true,
    description: "Pr\xE9paration aux concours des Commissaires, Officiers et Sous-Officiers de Police et Agent p\xE9nitentiaire"
  },
  {
    title: "Informatique",
    category: "Technologies & M\xE9tiers Num\xE9riques",
    price: 35e3,
    registrationFee: 35e3,
    monthlyFee: 25e3,
    hasPresentiel: true,
    hasOnline: true,
    description: "Bureautique avanc\xE9e, d\xE9veloppement web, outils num\xE9riques et cybers\xE9curit\xE9"
  }
];
async function seedFormations() {
  for (const f of DEFAULT_FORMATIONS) {
    const existing = await prisma_default.course.findFirst({ where: { title: f.title } });
    if (existing) {
      await prisma_default.course.update({
        where: { id: existing.id },
        data: {
          category: f.category,
          price: f.price,
          registrationFee: f.registrationFee,
          monthlyFee: f.monthlyFee,
          hasPresentiel: f.hasPresentiel,
          hasOnline: f.hasOnline,
          description: f.description
        }
      });
      console.log(`[Formations] Mis \xE0 jour: ${f.title} (${f.category} - Inscription: ${f.registrationFee} F / Mois: ${f.monthlyFee} F)`);
    } else {
      await prisma_default.course.create({
        data: f
      });
      console.log(`[Formations] Cr\xE9\xE9: ${f.title} (${f.category} - Inscription: ${f.registrationFee} F / Mois: ${f.monthlyFee} F)`);
    }
  }
}
if (process.argv[1]?.includes("seed-courses")) {
  seedFormations().then(() => {
    console.log("\u2705 Seeding des formations termin\xE9");
    return prisma_default.$disconnect();
  }).catch((err) => {
    console.error(err);
    return prisma_default.$disconnect();
  });
}

// server/index.ts
import path8 from "path";
import fs7 from "fs";
import { fileURLToPath as fileURLToPath7 } from "url";
var __dirname7 = path8.dirname(fileURLToPath7(import.meta.url));
async function ensureCourseColumns() {
  const tableCheck = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'Course' AND table_schema = 'public'
    ) AS exists
  `;
  if (!tableCheck[0]?.exists) {
    console.log("\u26A0\uFE0F Table Course introuvable, skip colonnes pricing");
    return;
  }
  const existingCols = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'Course' AND table_schema = 'public'
  `;
  const existingNames = new Set(existingCols.map((c) => c.column_name));
  const columns = [
    { name: "category", definition: `TEXT DEFAULT 'G\xE9n\xE9ral'` },
    { name: "registrationFee", definition: `DOUBLE PRECISION DEFAULT 45000` },
    { name: "registrationFeeInterieur", definition: `DOUBLE PRECISION DEFAULT 35000` },
    { name: "registrationFeeDiaspora", definition: `DOUBLE PRECISION DEFAULT 100000` },
    { name: "monthlyFee", definition: `DOUBLE PRECISION DEFAULT 30000` },
    { name: "monthlyFeeInterieur", definition: `DOUBLE PRECISION DEFAULT 25000` },
    { name: "monthlyFeeOnline", definition: `DOUBLE PRECISION DEFAULT 25000` },
    { name: "monthlyFeeBoth", definition: `DOUBLE PRECISION DEFAULT 35000` },
    { name: "monthlyFeeDiaspora", definition: `DOUBLE PRECISION DEFAULT 35000` },
    { name: "hasPresentiel", definition: `BOOLEAN NOT NULL DEFAULT true` },
    { name: "hasOnline", definition: `BOOLEAN NOT NULL DEFAULT true` }
  ];
  let added = 0;
  for (const col of columns) {
    if (existingNames.has(col.name)) continue;
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Course" ADD COLUMN "${col.name}" ${col.definition}`);
      added++;
      console.log(`  \u2795 Colonne Course."${col.name}" ajout\xE9e`);
    } catch (err) {
      if (err?.code !== "42710") {
        console.warn(`\u26A0\uFE0F [CourseColumns] Colonne ${col.name} :`, err?.message || err);
      }
    }
  }
  if (added > 0) {
    console.log(`\u2705 ${added} colonne(s) pricing ajout\xE9e(s) \xE0 la table Course`);
  } else {
    console.log("\u2705 Toutes les colonnes pricing de la table Course existent d\xE9j\xE0");
  }
}
var app = express();
var port = process.env.PORT || 3001;
var isProduction3 = process.env.NODE_ENV === "production";
app.set("trust proxy", 1);
if (!process.env.JWT_SECRET) {
  console.error("\u274C FATAL: JWT_SECRET est manquant dans les variables d'environnement.");
  process.exit(1);
}
var globalLimiter = rateLimit6({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 200,
  // 200 requêtes par fenêtre
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de requ\xEAtes. R\xE9essayez dans 15 minutes." }
});
var authLimiter = rateLimit6({
  windowMs: 15 * 60 * 1e3,
  max: 100,
  // 100 requêtes auth par fenêtre (GET /me, login, etc.)
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  // Ne compter que les échecs
  message: { error: "Trop de tentatives. R\xE9essayez dans 15 minutes." }
});
var webhookLimiter2 = rateLimit6({
  windowMs: 1 * 60 * 1e3,
  max: 30,
  // 30 webhooks par minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de requ\xEAtes webhook." }
});
var uploadLimiter2 = rateLimit6({
  windowMs: 60 * 60 * 1e3,
  max: 20,
  // 20 uploads par heure
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop d'uploads. R\xE9essayez dans une heure." }
});
var defaultOrigins = [
  "https://exacademie.net",
  "https://www.exacademie.net",
  "http://exacademie.net",
  "http://www.exacademie.net",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:5174",
  "http://localhost:3000",
  "https://coral-stork-926590.hostingersite.com"
];
var envOrigins = process.env.CORS_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) || [];
var frontendUrl = process.env.FRONTEND_URL?.trim();
var allowedOrigins = Array.from(/* @__PURE__ */ new Set([
  ...defaultOrigins,
  ...envOrigins,
  ...frontendUrl ? [frontendUrl] : []
]));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      workerSrc: ["'self'", "blob:"],
      connectSrc: ["'self'", "https://exacademie.net", "https://www.exacademie.net", "https://*.hostingersite.com", ...frontendUrl ? [frontendUrl] : []]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use("/api", globalLimiter);
var dbReady = false;
app.use("/api", (_req, res, next) => {
  if (!dbReady) {
    res.set("Retry-After", "2");
    return res.status(503).json({
      error: "Le backend est en cours de d\xE9marrage. Veuillez r\xE9essayer dans un instant."
    });
  }
  next();
});
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    const isAllowed = allowedOrigins.includes(origin) || origin.endsWith(".exacademie.net") || origin.endsWith(".hostingersite.com") || // Le navigateur d'un client distant ne peut jamais envoyer un Origin localhost :
    // autoriser n'importe quel port local est donc sûr, en dev comme en dev*Vite
    // dont le port peut dériver (5174 occupé → 5175, 5176…).
    /^https?:\/\/localhost:\d+$/.test(origin);
    if (isAllowed) {
      return callback(null, true);
    }
    console.warn(`[CORS] Origine bloqu\xE9e: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));
app.use("/api/payments/webhook", express.raw({ type: "application/json" }), (req, _res, next) => {
  if (Buffer.isBuffer(req.body)) {
    req.rawBody = req.body.toString("utf8");
    try {
      req.body = JSON.parse(req.rawBody);
    } catch {
    }
  }
  next();
});
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use("/api/auth", authLimiter, authRoutes_default);
app.use("/api/users", userRoutes_default);
app.use("/api/payments", paymentRoutes_default);
app.use("/api/notifications", notificationRoutes_default);
app.use("/api/expenses", expenseRoutes_default);
app.use("/api/stats", statsRoutes_default);
app.use("/api/receipts", receiptRoutes_default);
app.use("/api/testimonials", testimonialRoutes_default);
app.use("/api/courses", courseRoutes_default);
app.use("/api/categories", categoryRoutes_default);
app.use("/api/push", pushRoutes_default);
app.use("/api/calendar", calendarRoutes_default);
app.use("/api/evaluations", evaluationRoutes_default);
app.use("/api/cities", cityRoutes_default);
app.use("/api/sessions", sessionRoutes_default);
app.use("/api/subscriptions", subscriptionRoutes_default);
app.use("/api/contracts", contractRoutes_default);
app.use("/api/shop", shopRoutes_default);
app.use("/api/banners", bannerRoutes_default);
app.use("/api/blog", blogRoutes_default);
app.use("/api/siteconfig", siteConfigRoutes_default);
app.use("/api/app-settings", appSettingsRoutes_default);
var onlineUsers = /* @__PURE__ */ new Map();
var PRESENCE_TIMEOUT_MS = 6e4;
app.post("/api/presence/heartbeat", (req, res) => {
  const userId = req.body?.userId || req.user?.id;
  if (userId) onlineUsers.set(userId, Date.now());
  res.json({ ok: true });
});
app.get("/api/presence/online", (req, res) => {
  const now = Date.now();
  for (const [uid, ts] of onlineUsers) {
    if (now - ts > PRESENCE_TIMEOUT_MS) onlineUsers.delete(uid);
  }
  res.json({ online: Array.from(onlineUsers.keys()) });
});
app.get("/api/presence/status/:userId", (req, res) => {
  const ts = onlineUsers.get(req.params.userId);
  const isOnline = ts ? Date.now() - ts < PRESENCE_TIMEOUT_MS : false;
  res.json({ online: isOnline });
});
app.get("/api/health", async (req, res) => {
  const healthSecret = process.env.HEALTH_SECRET;
  if (isProduction3 && healthSecret) {
    const provided = req.headers["x-health-secret"];
    if (provided !== healthSecret) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return res.status(200).json({ status: "ok" });
      } catch {
        return res.status(503).json({ status: "error" });
      }
    }
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    const userCount = await prisma.user.count();
    const courseCount = await prisma.course.count();
    res.status(200).json({
      status: "ok",
      database: "connected",
      userCount,
      courseCount,
      message: "Backend et base de donn\xE9es op\xE9rationnels"
    });
  } catch (err) {
    console.error("Health check DB error:", err);
    res.status(500).json({
      status: "error",
      database: "disconnected",
      message: isProduction3 ? "Erreur de connexion \xE0 la base de donn\xE9es" : err?.message || String(err)
    });
  }
});
var projectRoot = process.cwd();
var rootUploads = path8.resolve(projectRoot, "uploads");
var serverUploads = path8.resolve(projectRoot, "server", "uploads");
for (const sub of ["products", "testimonials", "blog", "users", "sessions", "categories"]) {
  fs7.mkdirSync(path8.join(rootUploads, sub), { recursive: true });
}
var candidateDistPaths = [
  path8.resolve(projectRoot, "dist"),
  path8.resolve(__dirname7, "..", "dist"),
  path8.resolve(__dirname7, "dist")
];
var distPath = candidateDistPaths.find((p) => fs7.existsSync(p)) || candidateDistPaths[0];
app.use(express.static(distPath));
var publicDocPath = path8.resolve(projectRoot, "public", "doc");
if (fs7.existsSync(publicDocPath)) {
  app.use("/doc", express.static(publicDocPath));
}
if (fs7.existsSync(rootUploads)) {
  app.use("/uploads", express.static(rootUploads));
}
if (fs7.existsSync(serverUploads)) {
  app.use("/uploads", express.static(serverUploads));
}
app.use("/uploads", express.static(path8.join(__dirname7, "uploads")));
app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  if (req.path.startsWith("/api/")) return next();
  const indexPath = path8.join(distPath, "index.html");
  if (fs7.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});
async function initDatabaseDefaults() {
  try {
    console.log("\u{1F504} \xC9tablissement de la connexion Prisma...");
    await prisma.$connect();
    console.log("\u2705 Connexion Prisma active.");
    await ensureSessionTables();
    await ensureCategoryTable();
    try {
      await ensureCourseColumns();
    } catch (e) {
      console.error("\u26A0\uFE0F [CourseColumns] \xC9chec de la migration initiale:", e?.message || e);
      console.log("\u2139\uFE0F [CourseColumns] Le lazy migration dans getAllCourses ajoutera les colonnes manquantes au premier appel");
    }
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PendingRegistration" (
        "id" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "passwordHash" TEXT NOT NULL,
        "name" TEXT,
        "telephone" TEXT,
        "pays" TEXT,
        "ville" TEXT,
        "courseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "mode" TEXT,
        "coursParticuliers" BOOLEAN NOT NULL DEFAULT false,
        "monthlyAmount" DOUBLE PRECISION,
        "dateNaissance" TEXT,
        "geniusPhone" TEXT,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PendingRegistration_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "PendingRegistration_token_key" ON "PendingRegistration"("token")`);
    console.log("\u2705 Table PendingRegistration v\xE9rifi\xE9e/cr\xE9\xE9e");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SiteConfig" (
        "id" TEXT NOT NULL,
        "key" TEXT NOT NULL DEFAULT 'home',
        "content" TEXT NOT NULL DEFAULT '{}',
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "SiteConfig_key_key" ON "SiteConfig"("key")`);
    await prisma.siteConfig.upsert({
      where: { key: "home" },
      update: {},
      create: { key: "home", content: "{}" }
    });
    console.log("\u2705 Table SiteConfig v\xE9rifi\xE9e/cr\xE9\xE9e");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AppSettings" (
        "id" TEXT NOT NULL,
        "key" TEXT NOT NULL DEFAULT 'global',
        "additionalCourseAmount" DOUBLE PRECISION NOT NULL DEFAULT 10000,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "AppSettings_key_key" ON "AppSettings"("key")`);
    await prisma.appSettings.upsert({
      where: { key: "global" },
      update: {},
      create: { key: "global", additionalCourseAmount: 1e4 }
    });
    console.log("\u2705 Table AppSettings v\xE9rifi\xE9e/cr\xE9\xE9e");
    const featuredWithImage = await prisma.shopBanner.count({
      where: { featured: true, isActive: true, imageUrl: { not: null } }
    });
    if (featuredWithImage === 0) {
      const defaultHomeBanners = [
        { title: "Sessions Pr\xE9paratoires aux Concours Directs", subtitle: "Inscriptions ouvertes pour toutes les fili\xE8res", imageUrl: "/images/image2.jpeg", displayOrder: 1 },
        { title: "Encadrement par les Magistrats et Formateurs Experts", subtitle: "M\xE9thodologie et sujets types d\xE9crypt\xE9s", imageUrl: "/images/image1.jpeg", displayOrder: 2 },
        { title: "Formations En ligne & Pr\xE9sentiel", subtitle: "Cours du soir, week-ends et suivi sur mesure", imageUrl: "/images/image3.jpeg", displayOrder: 3 },
        { title: "Excellence Acad\xE9mie \xE0 vos c\xF4t\xE9s", subtitle: "L'\xE9cole de r\xE9f\xE9rence pour votre r\xE9ussite", imageUrl: "/images/images4.jpeg", displayOrder: 4 }
      ];
      for (const b of defaultHomeBanners) {
        await prisma.shopBanner.create({ data: { ...b, featured: true, isActive: true } });
      }
      console.log("\u2705 Banni\xE8res \xAB \xC0 la une \xBB par d\xE9faut cr\xE9\xE9es en base");
    }
    const cityCount = await prisma.city.count();
    if (cityCount === 0) {
      console.log("\u{1F504} Initialisation des villes par d\xE9faut...");
      const CI_DEFAULT = "Cote d'Ivoire";
      const defaultCities = [
        // CI
        { name: "Abidjan", country: CI_DEFAULT },
        { name: "Bouake", country: CI_DEFAULT },
        { name: "Yamoussoukro", country: CI_DEFAULT },
        { name: "Daloa", country: CI_DEFAULT },
        { name: "Korhogo", country: CI_DEFAULT },
        { name: "Divo", country: CI_DEFAULT },
        { name: "Man", country: CI_DEFAULT },
        { name: "San Pedro", country: CI_DEFAULT },
        { name: "Gagnoa", country: CI_DEFAULT },
        { name: "Abengourou", country: CI_DEFAULT },
        { name: "Dimbokro", country: CI_DEFAULT },
        { name: "Bouna", country: CI_DEFAULT },
        { name: "Bingerville", country: CI_DEFAULT },
        { name: "Grand-Bassam", country: CI_DEFAULT },
        { name: "Cocody", country: CI_DEFAULT },
        { name: "Marcory", country: CI_DEFAULT },
        { name: "Plateau", country: CI_DEFAULT },
        { name: "Treichville", country: CI_DEFAULT },
        { name: "Abobo", country: CI_DEFAULT },
        { name: "Koumassi", country: CI_DEFAULT },
        { name: "Port-Bouet", country: CI_DEFAULT },
        { name: "Anyama", country: CI_DEFAULT },
        { name: "Adjam\xE9", country: CI_DEFAULT },
        { name: "Bondoukou", country: CI_DEFAULT },
        { name: "Boundiali", country: CI_DEFAULT },
        { name: "Ferke", country: CI_DEFAULT },
        { name: "Guiglo", country: CI_DEFAULT },
        { name: "Issia", country: CI_DEFAULT },
        { name: "Jacqueville", country: CI_DEFAULT },
        { name: "Katiola", country: CI_DEFAULT },
        { name: "Lakota", country: CI_DEFAULT },
        { name: "Odienne", country: CI_DEFAULT },
        { name: "Oum\xE9", country: CI_DEFAULT },
        { name: "S\xE9gu\xE9la", country: CI_DEFAULT },
        { name: "Sinfra", country: CI_DEFAULT },
        { name: "Touba", country: CI_DEFAULT },
        { name: "Vavoua", country: CI_DEFAULT },
        { name: "Zuenoula", country: CI_DEFAULT },
        // Afrique
        { name: "Dakar", country: "Senegal" },
        { name: "Bamako", country: "Mali" },
        { name: "Ouagadougou", country: "Burkina Faso" },
        { name: "Cotonou", country: "Benin" },
        { name: "Lom\xE9", country: "Togo" },
        { name: "Accra", country: "Ghana" },
        { name: "Lagos", country: "Nigeria" },
        { name: "Yaound\xE9", country: "Cameroun" },
        { name: "Libreville", country: "Gabon" },
        // Europe
        { name: "Paris", country: "France" },
        { name: "Lyon", country: "France" },
        { name: "Marseille", country: "France" },
        { name: "Bruxelles", country: "Belgique" },
        { name: "Gen\xE8ve", country: "Suisse" },
        { name: "Berlin", country: "Allemagne" },
        { name: "Rome", country: "Italie" },
        { name: "Madrid", country: "Espagne" },
        { name: "Lisbonne", country: "Portugal" },
        { name: "Londres", country: "Royaume-Uni" },
        { name: "Amsterdam", country: "Pays-Bas" },
        { name: "Luxembourg", country: "Luxembourg" }
      ];
      for (const c of defaultCities) {
        await prisma.city.upsert({ where: { name: c.name }, update: {}, create: c });
      }
      console.log(`\u2705 ${defaultCities.length} villes par d\xE9faut cr\xE9\xE9es`);
    }
    const adminExists = await prisma.user.findUnique({
      where: { email: "admin@excellence.ci" }
    });
    if (!adminExists) {
      console.log("\u{1F504} Initialisation des comptes par d\xE9faut en cours...");
      const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;
      if (!initialPassword) {
        console.warn(
          "\u26A0\uFE0F  ADMIN_INITIAL_PASSWORD non d\xE9fini dans .env. Le compte admin ne sera PAS cr\xE9\xE9 automatiquement. Ajoutez ADMIN_INITIAL_PASSWORD dans votre .env puis red\xE9marrez."
        );
        return;
      }
      const password = await bcrypt3.hash(initialPassword, 12);
      const defaultUsers = [
        { email: "admin@excellence.ci", name: "Administrateur", role: "ADMIN", password },
        { email: "accountant@excellence.ci", name: "Comptable", role: "ACCOUNTANT", password },
        { email: "teacher@excellence.ci", name: "Enseignant", role: "TEACHER", password },
        { email: "student@excellence.ci", name: "\xC9tudiant Test", role: "STUDENT", password }
      ];
      for (const u of defaultUsers) {
        await prisma.user.upsert({
          where: { email: u.email },
          update: {},
          create: u
        });
      }
      console.log("\u2705 Comptes par d\xE9faut cr\xE9\xE9s. Mot de passe : voir ADMIN_INITIAL_PASSWORD dans .env");
    }
    const courseCount = await prisma.course.count();
    if (courseCount === 0) {
      console.log("\u{1F504} Initialisation des formations par d\xE9faut...");
      await seedFormations();
      console.log("\u2705 Formations par d\xE9faut cr\xE9\xE9es avec succ\xE8s");
    }
  } catch (err) {
    console.error("Erreur initialisation admin / formations :", err);
  } finally {
    dbReady = true;
    console.log("\u2705 Backend pr\xEAt \xE0 recevoir les requ\xEAtes API.");
  }
}
async function keepAlive() {
  const t0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const ms = Date.now() - t0;
    if (ms > 1e3) console.log(`[Neon Keep-Alive] OK (${ms}ms)`);
  } catch (err) {
    console.warn("\u26A0\uFE0F [Neon Keep-Alive] Ping DB :", err?.message || err?.code || String(err));
  }
}
app.listen(port, () => {
  console.log(`\u{1F680} Serveur d\xE9marr\xE9 sur le port ${port} [${isProduction3 ? "PRODUCTION" : "D\xC9VELOPPEMENT"}]`);
  keepAlive();
  setInterval(keepAlive, 180 * 1e3);
  initDatabaseDefaults();
}).on("error", (err) => {
  if (err?.code === "EADDRINUSE") {
    console.error(`\u274C Le port ${port} est d\xE9j\xE0 utilis\xE9. Un autre process \xE9coute d\xE9j\xE0 dessus ?`);
  } else {
    console.error("\u274C Erreur au d\xE9marrage du serveur:", err);
  }
  process.exit(1);
});
