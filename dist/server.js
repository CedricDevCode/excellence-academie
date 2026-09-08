// server/env.ts
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

// server/index.ts
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt3 from "bcrypt";

// server/utils/prisma.ts
import { PrismaClient } from "@prisma/client";
var prisma = new PrismaClient();
var prisma_default = prisma;

// server/routes/userRoutes.ts
import { Router } from "express";
import multer from "multer";
import path2 from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath as fileURLToPath2 } from "url";

// server/controllers/userController.ts
import bcrypt from "bcrypt";
var getUsers = async (req, res) => {
  try {
    const users = await prisma_default.user.findMany({
      include: {
        subscriptions: {
          include: {
            course: true
          }
        },
        payments: {
          include: {
            course: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};
var createUser = async (req, res) => {
  try {
    const { email, password, name, prenom, nom, role, telephone, ville, hourlyRate } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: "Email, mot de passe et r\xF4le sont requis" });
    }
    const existingUser = await prisma_default.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Cet email est d\xE9j\xE0 utilis\xE9" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const fullName = name || [prenom, nom].filter(Boolean).join(" ").trim() || email;
    const user = await prisma_default.user.create({
      data: {
        email,
        password: hashedPassword,
        name: fullName,
        role: role || "TEACHER",
        telephone,
        ville,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null
      }
    });
    res.status(201).json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
};
var updateUser = async (req, res) => {
  try {
    const id = req.params.id;
    const { email, password, name, prenom, nom, role, telephone, pays, ville, isActive, image, hourlyRate } = req.body;
    if (!id) {
      return res.status(400).json({ error: "ID utilisateur requis" });
    }
    const updateData = {};
    if (email !== void 0) updateData.email = email;
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
      updateData.password = await bcrypt.hash(password, 10);
    }
    const user = await prisma_default.user.update({
      where: { id },
      data: updateData
    });
    res.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
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
    if (password) updateData.password = await bcrypt.hash(password, 10);
    const user = await prisma_default.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, telephone: true, ville: true, pays: true, image: true, isActive: true }
    });
    res.json(user);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};
var deleteUser = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "ID utilisateur requis" });
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
    res.status(500).json({ error: "Failed to delete user" });
  }
};

// server/middleware/authMiddleware.ts
import jwt from "jsonwebtoken";
var authenticateToken = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
    const user = await prisma_default.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(403).json({ error: "Invalid token." });
  }
};
var authMiddleware = authenticateToken;
var requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: Insufficient role permissions" });
    }
    next();
  };
};

// server/routes/userRoutes.ts
var __dirname2 = path2.dirname(fileURLToPath2(import.meta.url));
var userUploadsDir = path2.join(__dirname2, "..", "uploads", "users");
fs.mkdirSync(userUploadsDir, { recursive: true });
var upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, userUploadsDir),
    filename: (_req, file, cb) => {
      const ext = path2.extname(file.originalname);
      cb(null, `${crypto.randomUUID()}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
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
function calcRegistrationPrice(pays, mode, ville, coursParticuliers) {
  if (coursParticuliers) return 2e5;
  if (isDiaspora(pays)) return 1e5;
  if (mode === "en_ligne" || mode === "les_deux") return 45e3;
  if (isAbidjan(ville)) return 45e3;
  return 35e3;
}
function calcMonthlyAmount(pays, mode, coursParticuliers, nbCourses) {
  if (coursParticuliers) return 0;
  if (isDiaspora(pays)) return 35e3;
  let base;
  if (mode === "en_ligne") {
    base = 25e3;
  } else if (mode === "les_deux") {
    base = 35e3;
  } else {
    base = 3e4;
  }
  const extraCourses = Math.max(0, nbCourses - 1);
  return base + extraCourses * 1e4;
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
    const fromAddress = process.env.SMTP_FROM || "noreply@excellence-academie.ci";
    await transporter.sendMail({
      from: `"Excellence Acad\xE9mie" <${fromAddress}>`,
      to: user.email,
      subject: title,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #f4f7f6;">
          <h2 style="color: #0056B3;">${title}</h2>
          <p>${message}</p>
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
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(payments);
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
      body: JSON.stringify(geniusPayBody)
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
      headers: geniusPayHeaders()
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
    const { userId, courseId, formule, successUrl, errorUrl, paymentMethod } = req.body;
    if (!userId || !courseId || !formule) {
      return res.status(400).json({ error: "userId, courseId et formule sont requis" });
    }
    const amount = calcRegistrationPrice("", "presentiel", "", false);
    const user = await prisma_default.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }
    const course = await prisma_default.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({ error: "Formation introuvable" });
    }
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
      body: JSON.stringify(geniusPayBody)
    });
    const gpData = await handleGeniusPayResponse(response);
    if (!gpData) {
      return res.status(502).json({
        error: "Le service de paiement est temporairement indisponible. Veuillez r\xE9essayer ou contacter l'administrateur."
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
      data: {
        userId,
        courseId,
        amount,
        status: "PENDING",
        nextPayment
      }
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
      headers: geniusPayHeaders()
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
    } else if (gpData.status === "failed" || gpData.status === "cancelled" || gpData.status === "expired") {
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
      customer: gpData.customer,
      metadata: gpData.metadata,
      environment: gpData.environment
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
    const environment = req.headers["x-webhook-environment"];
    if (!GENIUSPAY_WEBHOOK_SECRET) {
      if (GENIUSPAY_ENVIRONMENT !== "sandbox") {
        console.warn("GENIUSPAY_WEBHOOK_SECRET not configured. Skipping signature verification.");
      }
    } else if (signature && timestamp) {
      const rawBody = req.rawBody;
      if (rawBody) {
        const data = `${timestamp}.${rawBody}`;
        const expectedSignature = crypto2.createHmac("sha256", GENIUSPAY_WEBHOOK_SECRET).update(data).digest("hex");
        if (!crypto2.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))) {
          return res.status(401).json({ status: 401, detail: "Invalid signature" });
        }
      }
      const now = Math.floor(Date.now() / 1e3);
      const ts = parseInt(timestamp, 10);
      if (ts && Math.abs(now - ts) > 300) {
        return res.status(400).json({ status: 400, detail: "Timestamp too old" });
      }
    }
    const payload = req.body;
    if (event === "payment.success" || payload.event === "payment.success") {
      const data = payload.data || payload;
      const reference = data.reference;
      const metadata = data.metadata || {};
      const userId = metadata.user_id;
      const courseId = metadata.course_id;
      if (metadata.action === "shop_order") {
        const orderId = metadata.order_id;
        if (orderId) {
          const order = await prisma_default.shopOrder.update({
            where: { id: orderId },
            data: { status: "PAID" }
          });
          try {
            const mailOptions = {
              to: order.customerEmail,
              subject: `Confirmation de paiement - Excellence Acad\xE9mie`,
              html: `<p>Bonjour ${order.customerName},</p>
                     <p>Nous avons bien re\xE7u le paiement de ${order.totalAmount} FCFA pour votre commande (Ref: ${order.id}).</p>
                     <p>Nous la traiterons dans les plus brefs d\xE9lais.</p>
                     <p>Merci de votre confiance !</p>
                     <p>L'\xE9quipe Excellence Acad\xE9mie</p>`
            };
            await sendDirectEmail(mailOptions.to, mailOptions.subject, mailOptions.html);
          } catch (err) {
            console.error("Failed to send shop order payment confirmation email", err);
          }
          console.log(`Webhook: Shop Order paid - ${orderId}`);
        }
      } else if (!userId && metadata.action === "register") {
        const { email, password_hash, name: fullName, telephone, pays, ville, course_ids, mode, cours_particuliers, monthly_amount } = metadata;
        if (email && password_hash && course_ids) {
          let user = await prisma_default.user.findUnique({ where: { email } });
          if (!user) {
            user = await prisma_default.user.create({
              data: {
                email,
                password: password_hash,
                name: fullName || email,
                telephone: telephone || "",
                pays: pays || "",
                ville: ville || "",
                role: "STUDENT",
                isActive: true
              }
            });
            const matricule = await generateMatricule();
            await prisma_default.user.update({ where: { id: user.id }, data: { matricule } });
          }
          const courseIdList = course_ids ? Array.isArray(course_ids) ? course_ids : [course_ids] : [courseId].filter(Boolean);
          const cParticuliers = cours_particuliers === true || cours_particuliers === "true";
          const cMode = mode || "presentiel";
          const monthlyAmt = monthly_amount ? parseFloat(monthly_amount) : calcMonthlyAmount(pays || "", cMode, cParticuliers, courseIdList.length);
          const existingPayment = await prisma_default.payment.findFirst({ where: { geniusPayReference: reference } });
          if (!existingPayment) {
            const payment = await prisma_default.payment.create({
              data: { amount: data.amount || 0, userId: user.id, status: "SUCCESS", geniusPayReference: reference }
            });
            const receiptNumber = generateReceiptNumber();
            await prisma_default.payment.update({ where: { id: payment.id }, data: { receiptNumber } });
          }
          for (const cId of courseIdList) {
            const existingSub = await prisma_default.subscription.findFirst({ where: { userId: user.id, courseId: cId } });
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
                  formule: cMode,
                  coursParticuliers: cParticuliers
                }
              });
            }
          }
          console.log(`Webhook: User created from payment - ${email}`);
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
        const sub = await prisma_default.subscription.findUnique({
          where: { id: metadata.subscription_id }
        });
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
        if (userId && courseId) {
          await prisma_default.subscription.updateMany({
            where: { userId, courseId, status: "PENDING" },
            data: { status: "ACTIVE" }
          });
          await prisma_default.user.update({
            where: { id: userId },
            data: { isActive: true }
          });
        }
      }
      console.log(`Webhook: Payment successful - reference: ${reference}`);
    } else if (event === "payment.failed" || payload.event === "payment.failed") {
      const data = payload.data || payload;
      const reference = data.reference;
      if (reference) {
        await prisma_default.payment.updateMany({
          where: { geniusPayReference: reference },
          data: { status: "FAILED" }
        });
      }
      console.log(`Webhook: Payment failed - reference: ${reference}`);
    }
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook handling error:", error);
    res.status(200).json({ received: true });
  }
};

// server/routes/paymentRoutes.ts
var router2 = Router2();
router2.post("/webhook", handleWebhook);
router2.get("/geniuspay/status/:reference", checkPaymentStatus);
router2.use(authenticateToken);
router2.get("/my-payments", getMyPayments);
router2.get("/", requireRole(["ADMIN", "ACCOUNTANT"]), getPayments);
router2.post("/initialize", initializePayment);
router2.post("/verify", verifyPayment);
router2.post("/geniuspay/init", initPayment);
var paymentRoutes_default = router2;

// server/routes/authRoutes.ts
import { Router as Router3 } from "express";

// server/controllers/authController.ts
import bcrypt2 from "bcrypt";

// server/utils/jwt.ts
import jwt2 from "jsonwebtoken";
var JWT_SECRET = process.env.JWT_SECRET || "5a15b35f8e82b251380c15237e12c73b0bba9718318a1a030c24990792e60a65";
function signToken(userId, role) {
  return jwt2.sign({ userId, role }, JWT_SECRET, { expiresIn: "24h" });
}
function setAuthCookie(res, userId, role) {
  const token = signToken(userId, role);
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1e3,
    sameSite: "lax"
  });
}

// server/controllers/authController.ts
var register = async (req, res) => {
  try {
    const { email, password, name, nom, prenom, role, telephone, pays, ville } = req.body;
    if (!password) {
      return res.status(400).json({ error: "Le mot de passe est requis" });
    }
    const existingUser = await prisma_default.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Cet email est d\xE9j\xE0 utilis\xE9" });
    }
    const hashedPassword = await bcrypt2.hash(password, 10);
    const fullName = name || [prenom, nom].filter(Boolean).join(" ") || email;
    const user = await prisma_default.user.create({
      data: {
        email,
        password: hashedPassword,
        name: fullName,
        telephone,
        pays,
        ville,
        role: role || "STUDENT",
        isActive: true
      }
    });
    if (user.role === "STUDENT") {
      const matricule = await generateMatricule();
      await prisma_default.user.update({ where: { id: user.id }, data: { matricule } });
    }
    setAuthCookie(res, user.id, user.role);
    try {
      await sendNotification(user.id, "Bienvenue chez Excellence Acad\xE9mie !", "Votre compte a \xE9t\xE9 cr\xE9\xE9 avec succ\xE8s. Acc\xE9dez d\xE8s \xE0 pr\xE9sent \xE0 vos cours, emplois du temps et ressources.");
      await sendNotificationToRole("ADMIN", "Nouvelle inscription", `L'\xE9tudiant(e) ${user.name} (${user.email}) vient de s'inscrire sur la plateforme.`);
    } catch (err) {
      console.error("Notification error on registration:", err);
    }
    res.status(201).json({ message: "User registered successfully", userId: user.id });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Failed to register" });
  }
};
var registerAndPay = async (req, res) => {
  try {
    const { email, password, name, nom, prenom, telephone, pays, ville, courseIds, mode, coursParticuliers, paymentMethod, geniusPhone, dateNaissance } = req.body;
    if (!email || !password || !courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({ error: "Email, mot de passe et au moins un concours sont requis" });
    }
    const existingUser = await prisma_default.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "Cet email est d\xE9j\xE0 utilis\xE9" });
    }
    const courses = await prisma_default.course.findMany({ where: { id: { in: courseIds } } });
    if (courses.length !== courseIds.length) {
      return res.status(404).json({ error: "Une ou plusieurs formations introuvables" });
    }
    const isDiaspora2 = pays && pays.trim().toLowerCase() !== "c\xF4te d'ivoire" && pays.trim().toLowerCase() !== "cote d'ivoire";
    const effectiveMode = isDiaspora2 ? "en_ligne" : mode || "presentiel";
    const cParticuliers = coursParticuliers === true;
    const registrationAmount = calcRegistrationPrice(pays || "", effectiveMode, ville || "", cParticuliers);
    const monthlyAmount = calcMonthlyAmount(pays || "", effectiveMode, cParticuliers, courseIds.length);
    const amount = registrationAmount + monthlyAmount;
    const hashedPassword = await bcrypt2.hash(password, 10);
    const fullName = name || [prenom, nom].filter(Boolean).join(" ") || email;
    const paymentPhone = geniusPhone || telephone || "";
    const frontendUrl2 = process.env.FRONTEND_URL || "http://localhost:5173";
    const courseTitles = courses.map((c) => c.title).join(", ");
    const label = cParticuliers ? "Cours particuliers" : `Inscription (${effectiveMode})`;
    const geniusPayBody = {
      amount,
      description: `Inscription + 1er mois: ${fullName} - ${courseTitles} (${label})`,
      customer: {
        name: fullName,
        phone: paymentPhone,
        email,
        country: COUNTRY_TO_ISO2[pays || ""] || "CI"
      },
      metadata: {
        action: "register",
        email,
        password_hash: hashedPassword,
        name: fullName,
        telephone: telephone || "",
        genius_phone: paymentPhone,
        pays: pays || "",
        ville: ville || "",
        course_ids: courseIds,
        mode: effectiveMode,
        cours_particuliers: cParticuliers,
        monthly_amount: monthlyAmount,
        payment_method: paymentMethod || "",
        date_naissance: dateNaissance || ""
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
var confirmPayment = async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ error: "R\xE9f\xE9rence requise" });
    }
    const gpResponse = await fetch(`${GENIUSPAY_API_BASE}/payments/${reference}`, {
      headers: {
        "X-API-Key": process.env.GENIUSPAY_API_KEY || "",
        "X-API-Secret": process.env.GENIUSPAY_SECRET_KEY || "",
        "Accept": "application/json"
      },
      signal: AbortSignal.timeout(15e3)
    });
    const gpData = await handleGeniusPayResponse(gpResponse);
    if (!gpData) {
      return res.status(404).json({ error: "Transaction introuvable" });
    }
    const metadata = gpData.metadata || {};
    if (gpData.status === "completed" || gpData.status === "success") {
      const { email, password_hash, name: fullName, telephone, pays, ville, course_ids, mode, cours_particuliers, monthly_amount } = metadata;
      if (!email || !password_hash) {
        return res.status(400).json({ error: "Donn\xE9es de registration manquantes" });
      }
      let user = await prisma_default.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma_default.user.create({
          data: {
            email,
            password: password_hash,
            name: fullName || email,
            telephone: telephone || "",
            pays: pays || "",
            ville: ville || "",
            role: "STUDENT",
            isActive: true
          }
        });
      }
      if (!user.matricule && user.role === "STUDENT") {
        const matricule = await generateMatricule();
        await prisma_default.user.update({ where: { id: user.id }, data: { matricule } });
      }
      const courseIdList = course_ids ? Array.isArray(course_ids) ? course_ids : [course_ids] : [];
      const cParticuliers = cours_particuliers === true || cours_particuliers === "true";
      const cMode = mode || "presentiel";
      const inscriptionAmount = calcRegistrationPrice(pays || "", cMode, ville || "", cParticuliers);
      const monthlyAmt = monthly_amount ? parseFloat(monthly_amount) : calcMonthlyAmount(pays || "", cMode, cParticuliers, courseIdList.length);
      const totalAmount = inscriptionAmount + monthlyAmt;
      const existingPayment = await prisma_default.payment.findFirst({
        where: { geniusPayReference: reference }
      });
      if (!existingPayment) {
        const payment = await prisma_default.payment.create({
          data: { amount: gpData.amount || totalAmount, userId: user.id, status: "SUCCESS", geniusPayReference: reference }
        });
        const receiptNumber = generateReceiptNumber();
        await prisma_default.payment.update({ where: { id: payment.id }, data: { receiptNumber } });
      }
      for (const cId of courseIdList) {
        const existingSub = await prisma_default.subscription.findFirst({
          where: { userId: user.id, courseId: cId }
        });
        if (!existingSub) {
          const nextPayment = /* @__PURE__ */ new Date();
          nextPayment.setMonth(nextPayment.getMonth() + 1);
          await prisma_default.subscription.create({
            data: {
              userId: user.id,
              courseId: cId,
              amount: monthlyAmt,
              status: "ACTIVE",
              nextPayment,
              formule: cMode,
              coursParticuliers: cParticuliers
            }
          });
        }
      }
      try {
        await sendNotification(user.id, "Inscription et paiement valid\xE9s", `Votre paiement de ${totalAmount.toLocaleString("fr-FR")} FCFA a \xE9t\xE9 re\xE7u et valid\xE9 avec succ\xE8s. Bienvenue dans votre parcours de formation !`);
        await sendNotificationToRole("ADMIN", "Paiement inscription re\xE7u", `L'\xE9tudiant(e) ${user.name} a finalis\xE9 son inscription et pay\xE9 ${totalAmount.toLocaleString("fr-FR")} FCFA.`);
      } catch (err) {
        console.error("Notification error on payment confirmation:", err);
      }
      setAuthCookie(res, user.id, user.role);
      return res.json({
        success: true,
        status: gpData.status,
        user: { id: user.id, email: user.email, name: user.name, role: user.role }
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
    console.log(`[AUTH] Tentative de connexion pour : ${email}`);
    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }
    const cleanEmail = email.trim().toLowerCase();
    let user = null;
    try {
      user = await prisma_default.user.findFirst({
        where: {
          email: {
            equals: cleanEmail,
            mode: "insensitive"
          }
        }
      });
    } catch (dbErr) {
      console.warn("[AUTH] Requ\xEAte insensitive \xE9chou\xE9e, essai avec findUnique:", dbErr?.message);
      try {
        user = await prisma_default.user.findUnique({
          where: { email: cleanEmail }
        });
      } catch (innerErr) {
        console.error("[AUTH] Erreur base de donn\xE9es critique :", innerErr?.message || innerErr);
        return res.status(500).json({
          error: "Erreur serveur lors de la connexion",
          details: `Connexion \xE0 la base de donn\xE9es impossible : ${innerErr?.message || "Base non joignable"}. Veuillez v\xE9rifier DATABASE_URL et lancer "npx prisma db push".`
        });
      }
    }
    if (!user && cleanEmail === "admin@excellence.ci") {
      try {
        const hashedPassword = await bcrypt2.hash("password123", 10);
        user = await prisma_default.user.create({
          data: {
            email: "admin@excellence.ci",
            name: "Administrateur",
            role: "ADMIN",
            password: hashedPassword,
            isActive: true
          }
        });
        console.log("[AUTH] Compte Administrateur auto-initialis\xE9 avec succ\xE8s (admin@excellence.ci / password123)");
      } catch (createErr) {
        console.error("[AUTH] Erreur cr\xE9ation admin par d\xE9faut :", createErr?.message);
      }
    }
    if (!user || !user.password) {
      console.log(`[AUTH] Utilisateur non trouv\xE9 : ${cleanEmail}`);
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }
    const isMatch = await bcrypt2.compare(password, user.password);
    if (!isMatch) {
      console.log(`[AUTH] Mot de passe invalide pour : ${cleanEmail}`);
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }
    setAuthCookie(res, user.id, user.role);
    console.log(`[AUTH] Connexion r\xE9ussie : ${cleanEmail} (${user.role})`);
    res.json({
      message: "Logged in successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error?.message || error);
    res.status(500).json({
      error: "Erreur serveur lors de la connexion",
      details: error?.message || "Erreur interne inattendue"
    });
  }
};
var logout = (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
};
var getMe = async (req, res) => {
  try {
    const user = await prisma_default.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, image: true, telephone: true, ville: true, pays: true, isActive: true, matricule: true }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
};

// server/routes/authRoutes.ts
var router3 = Router3();
router3.post("/register", register);
router3.post("/register-and-pay", registerAndPay);
router3.post("/confirm-payment", confirmPayment);
router3.post("/login", login);
router3.post("/logout", logout);
router3.get("/me", authenticateToken, getMe);
var authRoutes_default = router3;

// server/routes/notificationRoutes.ts
import { Router as Router4 } from "express";
var router4 = Router4();
router4.use(authenticateToken);
router4.get("/stream", streamNotifications);
router4.get("/", getNotifications);
router4.put("/read-all", markAllAsRead);
router4.put("/:id/read", markAsRead);
router4.post("/bulk", sendBulkNotification);
var notificationRoutes_default = router4;

// server/routes/expenseRoutes.ts
import { Router as Router5 } from "express";

// server/controllers/expenseController.ts
var createExpense = async (req, res) => {
  try {
    const { amount, description, category, ville, teacherId, paymentMethod } = req.body;
    const expense = await prisma_default.expense.create({
      data: {
        amount: parseFloat(amount),
        description,
        category: category || null,
        ville: ville || null,
        teacherId: teacherId || null,
        paymentMethod,
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
    const { amount, description, category, ville, paymentMethod, status, teacherId } = req.body;
    const data = {};
    if (amount !== void 0) data.amount = parseFloat(amount);
    if (description !== void 0) data.description = description;
    if (category !== void 0) data.category = category;
    if (ville !== void 0) data.ville = ville;
    if (paymentMethod !== void 0) data.paymentMethod = paymentMethod;
    if (status !== void 0) data.status = status;
    if (teacherId !== void 0) data.teacherId = teacherId;
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
var router5 = Router5();
router5.use(authenticateToken);
router5.post("/", requireRole(["ADMIN", "ACCOUNTANT"]), createExpense);
router5.get("/", requireRole(["ADMIN", "ACCOUNTANT"]), getExpenses);
router5.get("/summary", requireRole(["ADMIN", "ACCOUNTANT"]), getExpenseSummary);
router5.put("/:id", requireRole(["ADMIN", "ACCOUNTANT"]), updateExpense);
router5.delete("/:id", requireRole(["ADMIN", "ACCOUNTANT"]), deleteExpense);
var expenseRoutes_default = router5;

// server/routes/statsRoutes.ts
import { Router as Router6 } from "express";

// server/controllers/statsController.ts
var getDashboardStats = async (req, res) => {
  try {
    const totalStudents = await prisma_default.user.count({ where: { role: "STUDENT" } });
    const totalTeachers = await prisma_default.user.count({ where: { role: "TEACHER" } });
    const payments = await prisma_default.payment.findMany({
      where: { status: "SUCCESS" },
      include: { course: true, user: { select: { ville: true } } }
    });
    const expenses = await prisma_default.expense.findMany({
      where: { status: "PAID" }
    });
    const shopOrders = await prisma_default.shopOrder.findMany({
      where: { status: { in: ["PAID", "DELIVERED"] } }
    });
    const recentPayments = await prisma_default.payment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } }
    });
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0) + shopOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const months = ["Janvier", "F\xE9vrier", "Mars", "Avril", "Mai", "Juin", "Juillet", "Ao\xFBt", "Septembre", "Octobre", "Novembre", "D\xE9cembre"];
    const chartDataMap = {};
    const enrollmentsMap = {};
    const revenueByCourseMap = {};
    const revenueByCityMap = {};
    payments.forEach((p) => {
      const monthIndex = new Date(p.createdAt).getMonth();
      const monthName = months[monthIndex];
      if (!chartDataMap[monthName]) chartDataMap[monthName] = { name: monthName, Revenus: 0, Depenses: 0 };
      chartDataMap[monthName].Revenus += p.amount;
      if (!enrollmentsMap[monthName]) enrollmentsMap[monthName] = 0;
      enrollmentsMap[monthName] += 1;
      if (p.course) {
        if (!revenueByCourseMap[p.course.title]) revenueByCourseMap[p.course.title] = 0;
        revenueByCourseMap[p.course.title] += p.amount;
      }
      const city = p.user?.ville?.trim() || "Non pr\xE9cis\xE9e";
      if (!revenueByCityMap[city]) revenueByCityMap[city] = 0;
      revenueByCityMap[city] += p.amount;
    });
    expenses.forEach((e) => {
      const monthIndex = new Date(e.createdAt).getMonth();
      const monthName = months[monthIndex];
      if (!chartDataMap[monthName]) chartDataMap[monthName] = { name: monthName, Revenus: 0, Depenses: 0 };
      chartDataMap[monthName].Depenses += e.amount;
    });
    shopOrders.forEach((o) => {
      const monthIndex = new Date(o.createdAt).getMonth();
      const monthName = months[monthIndex];
      if (!chartDataMap[monthName]) chartDataMap[monthName] = { name: monthName, Revenus: 0, Depenses: 0 };
      chartDataMap[monthName].Revenus += o.totalAmount;
      const city = o.city?.trim() || "Non pr\xE9cis\xE9e";
      if (!revenueByCityMap[city]) revenueByCityMap[city] = 0;
      revenueByCityMap[city] += o.totalAmount;
    });
    const chartData = Object.values(chartDataMap);
    const enrollmentsData = Object.keys(enrollmentsMap).map((k) => ({ name: k, Inscriptions: enrollmentsMap[k] }));
    const revenueByCourseData = Object.keys(revenueByCourseMap).map((k) => ({ name: k, Revenus: revenueByCourseMap[k] }));
    const revenueByCityData = Object.keys(revenueByCityMap).map((k) => ({ name: k, Revenus: revenueByCityMap[k] }));
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
    const payments = await prisma_default.payment.findMany({
      where: { status: "SUCCESS" },
      include: { user: { select: { ville: true } } }
    });
    const revenueByCity = {};
    payments.forEach((p) => {
      const city = p.user?.ville?.trim() || "Non pr\xE9cis\xE9e";
      if (!revenueByCity[city]) revenueByCity[city] = { revenue: 0, count: 0 };
      revenueByCity[city].revenue += p.amount;
      revenueByCity[city].count += 1;
    });
    const shopOrders = await prisma_default.shopOrder.findMany({
      where: { status: { in: ["PAID", "DELIVERED"] } }
    });
    shopOrders.forEach((o) => {
      const city = o.city?.trim() || "Non pr\xE9cis\xE9e";
      if (!revenueByCity[city]) revenueByCity[city] = { revenue: 0, count: 0 };
      revenueByCity[city].revenue += o.totalAmount;
      revenueByCity[city].count += 1;
    });
    const expenses = await prisma_default.expense.findMany({
      where: { status: "PAID" },
      select: { amount: true, ville: true }
    });
    const expenseByCity = {};
    expenses.forEach((e) => {
      const city = e.ville?.trim() || "Non pr\xE9cis\xE9e";
      if (!expenseByCity[city]) expenseByCity[city] = { expense: 0, count: 0 };
      expenseByCity[city].expense += e.amount;
      expenseByCity[city].count += 1;
    });
    const allCities = /* @__PURE__ */ new Set([...Object.keys(revenueByCity), ...Object.keys(expenseByCity)]);
    const cityData = Array.from(allCities).map((city) => ({
      city,
      revenue: revenueByCity[city]?.revenue || 0,
      revenueCount: revenueByCity[city]?.count || 0,
      expense: expenseByCity[city]?.expense || 0,
      expenseCount: expenseByCity[city]?.count || 0,
      net: (revenueByCity[city]?.revenue || 0) - (expenseByCity[city]?.expense || 0)
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
    const content = `
      <h1>Re\xE7u de Paiement</h1>
      <p><strong>Acad\xE9mie:</strong> Excellence Acad\xE9mie</p>
      <p><strong>Date:</strong> ${new Date(payment.createdAt).toLocaleDateString()}</p>
      <p><strong>\xC9tudiant:</strong> ${payment.user?.name || payment.user?.email}</p>
      <p><strong>Montant:</strong> ${payment.amount} FCFA</p>
      <p><strong>Statut:</strong> ${payment.status}</p>
      ${payment.course ? `<p><strong>Cours:</strong> ${payment.course.title}</p>` : ""}
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
import multer2 from "multer";
import path4 from "path";
import fs2 from "fs";
import crypto3 from "crypto";
import { fileURLToPath as fileURLToPath4 } from "url";

// server/controllers/testimonialController.ts
import path3 from "path";
import { fileURLToPath as fileURLToPath3 } from "url";
var __dirname3 = path3.dirname(fileURLToPath3(import.meta.url));
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
        isActive: false
        // Requires admin approval
      }
    });
    res.status(201).json(testimonial);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la soumission de l'avis." });
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
    const { isActive } = req.body;
    const testimonial = await prisma_default.testimonial.update({
      where: { id },
      data: { isActive }
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
var __dirname4 = path4.dirname(fileURLToPath4(import.meta.url));
var uploadsDir = path4.join(__dirname4, "..", "uploads", "testimonials");
fs2.mkdirSync(uploadsDir, { recursive: true });
var upload2 = multer2({
  storage: multer2.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path4.extname(file.originalname);
      cb(null, `${crypto3.randomUUID()}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
});
var router8 = Router8();
router8.get("/", getTestimonials);
router8.post("/", createTestimonial);
router8.post("/upload", upload2.array("images", 3), uploadTestimonialImage);
router8.get("/admin/all", authenticateToken, requireRole(["ADMIN"]), getAllTestimonials);
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
var getAllCourses = async (req, res) => {
  try {
    const { category } = req.query;
    const where = {};
    if (category && typeof category === "string" && category.trim() !== "") {
      where.category = category.trim();
    }
    const courses = await prisma_default.course.findMany({
      where,
      orderBy: [{ category: "asc" }, { title: "asc" }],
      include: {
        _count: {
          select: {
            subscriptions: true,
            payments: true
          }
        }
      }
    });
    res.json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la r\xE9cup\xE9ration des formations" });
  }
};
var createCourse = async (req, res) => {
  try {
    const { title, description, price, category } = req.body;
    if (!title || price === void 0) {
      return res.status(400).json({ message: "Le titre et le prix sont obligatoires" });
    }
    const course = await prisma_default.course.create({
      data: {
        title: title.trim(),
        description: description ? description.trim() : null,
        price: Number(price),
        category: category && category.trim() ? category.trim() : "G\xE9n\xE9ral"
      }
    });
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
    const { title, description, price, category } = req.body;
    const course = await prisma_default.course.update({
      where: { id },
      data: {
        title: title !== void 0 ? title.trim() : void 0,
        description: description !== void 0 ? description.trim() : void 0,
        price: price !== void 0 ? Number(price) : void 0,
        category: category !== void 0 ? category ? category.trim() : "G\xE9n\xE9ral" : void 0
      }
    });
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
    await prisma_default.course.delete({ where: { id } });
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
import multer3 from "multer";

// server/controllers/sessionController.ts
import crypto4 from "crypto";
async function ensureTable() {
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
  } catch (e) {
  }
  try {
    await prisma_default.$executeRawUnsafe(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hourlyRate" REAL
    `);
  } catch (e) {
  }
  try {
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
  } catch (e) {
  }
  try {
    await prisma_default.$executeRawUnsafe(`DROP TABLE IF EXISTS "TeacherSession"`);
  } catch (e) {
  }
}
ensureTable();
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
    const id = crypto4.randomUUID();
    const now = /* @__PURE__ */ new Date();
    await prisma_default.$executeRawUnsafe(
      `INSERT INTO "CourseSession"
       (id, "teacherId", "courseId", "weekLabel", "weekStart", "weekEnd", date, "startTime", "endTime", hours, type, location, description, status, "notified", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'SCHEDULED', false, $14, $14)`,
      id,
      teacherId,
      courseId || null,
      weekLabel,
      weekStart,
      weekEnd,
      new Date(date),
      startTime,
      endTime,
      hours,
      type || "PRESENTIEL",
      location || null,
      description || null,
      now
    );
    const teacher = await prisma_default.user.findUnique({
      where: { id: teacherId },
      select: { id: true, name: true, email: true }
    });
    if (notifyStudents && courseId) {
      const subscriptions = await prisma_default.$queryRawUnsafe(
        `SELECT u.id FROM "User" u
         INNER JOIN "Subscription" s ON u.id = s."userId"
         WHERE s."courseId" = $1 AND s.status = 'ACTIVE'`,
        courseId
      );
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
    await prisma_default.$executeRawUnsafe('DELETE FROM "CourseSession" WHERE id = $1', id);
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
    const rows = await prisma_default.$queryRawUnsafe(
      `SELECT * FROM "CourseSession" WHERE id = $1`,
      id
    );
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
    await prisma_default.$executeRawUnsafe(
      `UPDATE "CourseSession" SET status = 'COMPLETED', "updatedAt" = NOW() WHERE id = $1`,
      id
    );
    res.json({ success: true, status: "COMPLETED" });
  } catch (error) {
    console.error("Complete session error:", error);
    res.status(500).json({ error: "Failed to complete session" });
  }
};
var validateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await prisma_default.$queryRawUnsafe(
      `SELECT * FROM "CourseSession" WHERE id = $1`,
      id
    );
    if (!rows.length) {
      return res.status(404).json({ error: "S\xE9ance introuvable" });
    }
    const session = rows[0];
    if (session.status !== "COMPLETED") {
      return res.status(400).json({ error: "Seules les s\xE9ances termin\xE9es peuvent \xEAtre valid\xE9es" });
    }
    await prisma_default.$executeRawUnsafe(
      `UPDATE "CourseSession" SET status = 'VALIDATED', "updatedAt" = NOW() WHERE id = $1`,
      id
    );
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
    const rows = await prisma_default.$queryRawUnsafe(
      `SELECT * FROM "CourseSession" WHERE id = $1`,
      id
    );
    if (!rows.length) {
      return res.status(404).json({ error: "S\xE9ance introuvable" });
    }
    const fileId = crypto4.randomUUID();
    const base64 = file.buffer.toString("base64");
    const mimeType = file.mimetype;
    await prisma_default.$executeRawUnsafe(
      `INSERT INTO "SessionFile" (id, "sessionId", "fileName", "fileType", "fileData", "uploadedAt")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      fileId,
      id,
      file.originalname,
      mimeType,
      base64
    );
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
    const rows = await prisma_default.$queryRawUnsafe(
      `SELECT id, "sessionId", "fileName", "fileType", "uploadedAt" FROM "SessionFile" WHERE "sessionId" = $1 ORDER BY "uploadedAt" DESC`,
      id
    );
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
    const rows = await prisma_default.$queryRawUnsafe(
      `SELECT * FROM "SessionFile" WHERE id = $1`,
      fileId
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Fichier introuvable" });
    }
    const file = rows[0];
    const buffer = Buffer.from(file.fileData, "base64");
    res.setHeader("Content-Type", file.fileType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
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
    const rows = await prisma_default.$queryRawUnsafe(
      `SELECT s.*, u.id as teacher_id, u.name as teacher_name, u.email as teacher_email, u."hourlyRate",
              c.id as course_id, c.title as course_title
       FROM "CourseSession" s
       LEFT JOIN "User" u ON s."teacherId" = u.id
       LEFT JOIN "Course" c ON s."courseId" = c.id
       WHERE s.date >= $1 AND s.date <= $2 AND (s.status = 'VALIDATED' OR s.status = 'SCHEDULED' OR s.status = 'COMPLETED')
       ORDER BY s."teacherId", s.date ASC`,
      startDate,
      endDate
    );
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
      headers: geniusPayHeaders()
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
        })
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
        idempotency_key: crypto4.randomUUID()
      })
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
        reference: `SANDBOX-${crypto4.randomUUID().slice(0, 8)}`,
        error: `\u26A0\uFE0F Mode sandbox : paiement simul\xE9. ${apiMsg}`
      };
    }
    return { success: false, error: apiMsg };
  } catch (e) {
    const env = GENIUSPAY_ENVIRONMENT;
    if (env === "sandbox") {
      return {
        success: true,
        reference: `SANDBOX-${crypto4.randomUUID().slice(0, 8)}`,
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
    await prisma_default.$executeRawUnsafe(
      `UPDATE "CourseSession" SET status = 'PAID', "updatedAt" = NOW()
       WHERE "teacherId" = $1 AND date >= $2 AND date <= $3 AND status IN ('VALIDATED', 'COMPLETED', 'SCHEDULED')`,
      teacherId,
      startDate,
      endDate
    );
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
    const subscriptions = await prisma_default.$queryRawUnsafe(
      `SELECT "courseId" FROM "Subscription" WHERE "userId" = $1 AND status = 'ACTIVE'`,
      userId
    );
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
var upload3 = multer3({ storage: multer3.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
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
router13.post("/:id/files", requireRole(["TEACHER"]), upload3.single("file"), uploadSessionFile);
router13.get("/:id/files", requireRole(["STUDENT", "TEACHER", "ADMIN", "SECRETARY"]), getSessionFiles);
var sessionRoutes_default = router13;

// server/routes/subscriptionRoutes.ts
import { Router as Router14 } from "express";

// server/controllers/subscriptionController.ts
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
      body: JSON.stringify(geniusPayBody)
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
router14.get("/my-subscriptions", getMySubscriptions);
router14.get("/overdue", requireRole(["ADMIN", "ACCOUNTANT", "STUDENT"]), getOverdueItems);
router14.post("/pay", requireRole(["STUDENT"]), paySubscription);
var subscriptionRoutes_default = router14;

// server/routes/contractRoutes.ts
import { Router as Router15 } from "express";

// server/utils/contractPdf.ts
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import path5 from "path";
import fs3 from "fs";
import { fileURLToPath as fileURLToPath5 } from "url";
var __dirname5 = path5.dirname(fileURLToPath5(import.meta.url));
function base64ToBytes(base64) {
  return Buffer.from(base64, "base64");
}
async function generateSignedContractPdf(signatureDataUrl, studentName) {
  const pdfPath = path5.resolve(__dirname5, "..", "..", "public", "doc", "contrat_exacademy.pdf");
  const pdfBytes = fs3.readFileSync(pdfPath);
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
import multer4 from "multer";
import path7 from "path";
import fs4 from "fs";
import crypto5 from "crypto";
import { fileURLToPath as fileURLToPath7 } from "url";

// server/controllers/shopController.ts
import path6 from "path";
import { fileURLToPath as fileURLToPath6 } from "url";
var __dirname6 = path6.dirname(fileURLToPath6(import.meta.url));
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
      body: JSON.stringify(geniusPayBody)
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
        const mailOptions = {
          to: order.customerEmail,
          subject: `Mise \xE0 jour de votre commande Excellence Acad\xE9mie - ${status}`,
          html: `<p>Bonjour ${order.customerName},</p>
                 <p>Le statut de votre commande (Ref: ${order.id}) est maintenant : <strong>${status}</strong>.</p>
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
var __dirname7 = path7.dirname(fileURLToPath7(import.meta.url));
var uploadsDir2 = path7.join(__dirname7, "..", "uploads", "products");
fs4.mkdirSync(uploadsDir2, { recursive: true });
var upload4 = multer4({
  storage: multer4.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir2),
    filename: (_req, file, cb) => {
      const ext = path7.extname(file.originalname);
      cb(null, `${crypto5.randomUUID()}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
});
var router16 = Router16();
router16.get("/products", getProducts);
router16.get("/products/:id", getProductById);
router16.post("/orders", createOrder);
router16.get("/products/:id/reviews", getProductReviews);
router16.post("/products/:id/reviews", authenticateToken, createReview);
router16.get("/my-orders", authenticateToken, getStudentOrders);
router16.get("/admin/products", authenticateToken, requireRole(["ADMIN", "SECRETARY"]), getAllProducts);
router16.post("/admin/products/upload", authenticateToken, requireRole(["ADMIN", "SECRETARY"]), upload4.single("image"), uploadProductImage);
router16.post("/admin/products", authenticateToken, requireRole(["ADMIN", "SECRETARY"]), createProduct);
router16.put("/admin/products/:id", authenticateToken, requireRole(["ADMIN", "SECRETARY"]), updateProduct);
router16.delete("/admin/products/:id", authenticateToken, requireRole(["ADMIN", "SECRETARY"]), deleteProduct);
router16.get("/admin/orders", authenticateToken, requireRole(["ADMIN", "SECRETARY"]), getOrders);
router16.put("/admin/orders/:id/status", authenticateToken, requireRole(["ADMIN", "SECRETARY"]), updateOrderStatus);
var shopRoutes_default = router16;

// server/routes/bannerRoutes.ts
import { Router as Router17 } from "express";

// server/controllers/bannerController.ts
import { PrismaClient as PrismaClient2 } from "@prisma/client";
var prisma2 = new PrismaClient2();
var getActiveBanners = async (req, res) => {
  try {
    const now = /* @__PURE__ */ new Date();
    const banners = await prisma2.shopBanner.findMany({
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
    res.status(500).json({ message: "Erreur lors du chargement des banni\xE8res", error: error.message });
  }
};
var getAllBanners = async (req, res) => {
  try {
    const banners = await prisma2.shopBanner.findMany({
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
    res.status(500).json({ message: "Erreur lors du chargement des banni\xE8res", error: error.message });
  }
};
var getBannerById = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await prisma2.shopBanner.findUnique({
      where: { id },
      include: {
        product: true
      }
    });
    if (!banner) return res.status(404).json({ message: "Banni\xE8re non trouv\xE9e" });
    res.json(banner);
  } catch (error) {
    res.status(500).json({ message: "Erreur", error: error.message });
  }
};
var createBanner = async (req, res) => {
  try {
    const { title, subtitle, description, imageUrl, backgroundColor, badgeText, featured, displayOrder, isActive, productId, startDate, endDate } = req.body;
    if (!title) return res.status(400).json({ message: "Le titre est requis" });
    const banner = await prisma2.shopBanner.create({
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
    res.status(500).json({ message: "Erreur lors de la cr\xE9ation", error: error.message });
  }
};
var updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, description, imageUrl, backgroundColor, badgeText, featured, displayOrder, isActive, productId, startDate, endDate } = req.body;
    const banner = await prisma2.shopBanner.update({
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
    res.status(500).json({ message: "Erreur lors de la mise \xE0 jour", error: error.message });
  }
};
var deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma2.shopBanner.delete({
      where: { id }
    });
    res.json({ message: "Banni\xE8re supprim\xE9e avec succ\xE8s" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression", error: error.message });
  }
};

// server/routes/bannerRoutes.ts
var router17 = Router17();
router17.get("/public", getActiveBanners);
router17.get("/", authMiddleware, getAllBanners);
router17.get("/:id", authMiddleware, getBannerById);
router17.post("/", authMiddleware, createBanner);
router17.put("/:id", authMiddleware, updateBanner);
router17.delete("/:id", authMiddleware, deleteBanner);
var bannerRoutes_default = router17;

// server/routes/blogRoutes.ts
import { Router as Router18 } from "express";
import multer5 from "multer";
import path9 from "path";
import fs5 from "fs";
import crypto6 from "crypto";
import { fileURLToPath as fileURLToPath9 } from "url";

// server/controllers/blogController.ts
import path8 from "path";
import { fileURLToPath as fileURLToPath8 } from "url";
var __dirname8 = path8.dirname(fileURLToPath8(import.meta.url));
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
          tags: { include: { tag: true } },
          _count: { select: { comments: true, exercises: true } }
        }
      }),
      prisma_default.blogPost.count({ where })
    ]);
    res.json({ posts, total, page, limit, totalPages: Math.ceil(total / limit) });
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
          include: {
            _count: { select: { submissions: true } }
          }
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
var __dirname9 = path9.dirname(fileURLToPath9(import.meta.url));
var blogUploadsDir = path9.join(__dirname9, "..", "uploads", "blog");
fs5.mkdirSync(blogUploadsDir, { recursive: true });
var upload5 = multer5({
  storage: multer5.diskStorage({
    destination: (_req, _file, cb) => cb(null, blogUploadsDir),
    filename: (_req, file, cb) => {
      const ext = path9.extname(file.originalname);
      cb(null, `${crypto6.randomUUID()}${ext}`);
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
router18.post("/:id/attachments", requireRole(["ADMIN", "TEACHER", "SECRETARY"]), upload5.single("file"), uploadPostAttachment);
router18.get("/:postId/comments", getComments);
router18.post("/:postId/comments", createComment);
router18.delete("/comments/:id", deleteComment);
router18.post("/:postId/exercises", requireRole(["ADMIN", "TEACHER", "SECRETARY"]), createExercise);
router18.put("/exercises/:id", requireRole(["ADMIN", "TEACHER", "SECRETARY"]), updateExercise);
router18.delete("/exercises/:id", requireRole(["ADMIN", "TEACHER", "SECRETARY"]), deleteExercise);
router18.post("/exercises/:id/attachments", requireRole(["ADMIN", "TEACHER", "SECRETARY"]), upload5.single("file"), uploadExerciseAttachment);
router18.post("/exercises/:id/submit", requireRole(["STUDENT"]), upload5.single("file"), submitExercise);
router18.get("/exercises/:id/submissions", requireRole(["ADMIN", "TEACHER", "SECRETARY"]), getSubmissions);
router18.put("/submissions/:id/evaluate", requireRole(["ADMIN", "TEACHER", "SECRETARY"]), evaluateSubmission);
var blogRoutes_default = router18;

// server/seed-courses.ts
import { PrismaClient as PrismaClient3 } from "@prisma/client";
var prisma3 = new PrismaClient3();
var DEFAULT_FORMATIONS = [
  {
    title: "Magistrature",
    category: "Concours Juridiques & Judiciaires",
    price: 15e4,
    description: "Pr\xE9paration intensive au concours d'acc\xE8s \xE0 la Magistrature"
  },
  {
    title: "Greffe",
    category: "Concours Juridiques & Judiciaires",
    price: 12e4,
    description: "Pr\xE9paration compl\xE8te au concours des greffiers et administrateurs des greffes"
  },
  {
    title: "Avocature & Notariat",
    category: "Concours Juridiques & Judiciaires",
    price: 15e4,
    description: "Pr\xE9paration au CAPA, examen d'avocat et concours de notariat"
  },
  {
    title: "ENA (Tous cycles)",
    category: "Administration Publique",
    price: 1e5,
    description: "Pr\xE9paration aux cycles Moyen, Moyen Sup\xE9rieur et Sup\xE9rieur de l'ENA"
  },
  {
    title: "Fonction Publique",
    category: "Administration Publique",
    price: 8e4,
    description: "Concours directs et professionnels de la Fonction Publique"
  },
  {
    title: "EPPJEJ & EPP",
    category: "Administration Publique",
    price: 1e5,
    description: "Pr\xE9paration aux concours de la protection judiciaire de l'enfance et de la jeunesse"
  },
  {
    title: "Police",
    category: "S\xE9curit\xE9 & Force Publique",
    price: 12e4,
    description: "Pr\xE9paration aux concours des Officiers et Sous-Officiers de Police"
  },
  {
    title: "Informatique",
    category: "Technologies & M\xE9tiers Num\xE9riques",
    price: 5e4,
    description: "Formation pratique aux outils num\xE9riques, bureautique et informatique"
  }
];
async function seedFormations() {
  for (const f of DEFAULT_FORMATIONS) {
    const existing = await prisma3.course.findFirst({ where: { title: f.title } });
    if (existing) {
      await prisma3.course.update({
        where: { id: existing.id },
        data: {
          category: f.category,
          price: f.price,
          description: f.description
        }
      });
      console.log(`[Formations] Mis \xE0 jour: ${f.title} (${f.category} - ${f.price} FCFA)`);
    } else {
      await prisma3.course.create({
        data: f
      });
      console.log(`[Formations] Cr\xE9\xE9: ${f.title} (${f.category} - ${f.price} FCFA)`);
    }
  }
}
if (process.argv[1]?.includes("seed-courses")) {
  seedFormations().then(() => {
    console.log("\u2705 Seeding des formations termin\xE9");
    return prisma3.$disconnect();
  }).catch((err) => {
    console.error(err);
    return prisma3.$disconnect();
  });
}

// server/index.ts
import path10 from "path";
import fs6 from "fs";
import { fileURLToPath as fileURLToPath10 } from "url";
var __dirname10 = path10.dirname(fileURLToPath10(import.meta.url));
var app = express();
var port = process.env.PORT || 3001;
var defaultOrigins = ["http://localhost:5173", "http://localhost:4173", "http://localhost:5174"];
var envOrigins = process.env.CORS_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) || [];
var frontendUrl = process.env.FRONTEND_URL?.trim();
var allowedOrigins = Array.from(/* @__PURE__ */ new Set([
  ...defaultOrigins,
  ...envOrigins,
  ...frontendUrl ? [frontendUrl] : []
]));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
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
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());
app.use("/api/auth", authRoutes_default);
app.use("/api/users", userRoutes_default);
app.use("/api/payments", paymentRoutes_default);
app.use("/api/notifications", notificationRoutes_default);
app.use("/api/expenses", expenseRoutes_default);
app.use("/api/stats", statsRoutes_default);
app.use("/api/receipts", receiptRoutes_default);
app.use("/api/testimonials", testimonialRoutes_default);
app.use("/api/courses", courseRoutes_default);
app.use("/api/calendar", calendarRoutes_default);
app.use("/api/evaluations", evaluationRoutes_default);
app.use("/api/cities", cityRoutes_default);
app.use("/api/sessions", sessionRoutes_default);
app.use("/api/subscriptions", subscriptionRoutes_default);
app.use("/api/contracts", contractRoutes_default);
app.use("/api/shop", shopRoutes_default);
app.use("/api/banners", bannerRoutes_default);
app.use("/api/blog", blogRoutes_default);
app.get("/api/health", async (req, res) => {
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
      error: err?.message || String(err),
      hint: 'V\xE9rifiez la variable DATABASE_URL dans votre fichier .env et lancez "npx prisma db push"'
    });
  }
});
var projectRoot = process.cwd();
var rootUploads = path10.resolve(projectRoot, "uploads");
var serverUploads = path10.resolve(projectRoot, "server", "uploads");
for (const sub of ["products", "testimonials", "blog", "users", "sessions"]) {
  fs6.mkdirSync(path10.join(rootUploads, sub), { recursive: true });
}
var candidateDistPaths = [
  path10.resolve(projectRoot, "dist"),
  path10.resolve(__dirname10, "..", "dist"),
  path10.resolve(__dirname10, "dist")
];
var distPath = candidateDistPaths.find((p) => fs6.existsSync(p)) || candidateDistPaths[0];
app.use(express.static(distPath));
if (fs6.existsSync(rootUploads)) {
  app.use("/uploads", express.static(rootUploads));
}
if (fs6.existsSync(serverUploads)) {
  app.use("/uploads", express.static(serverUploads));
}
app.use("/uploads", express.static(path10.join(__dirname10, "uploads")));
app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  if (req.path.startsWith("/api/")) return next();
  const indexPath = path10.join(distPath, "index.html");
  if (fs6.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});
async function initDatabaseDefaults() {
  try {
    const adminExists = await prisma.user.findUnique({
      where: { email: "admin@excellence.ci" }
    });
    if (!adminExists) {
      console.log("\u{1F504} Initialisation des comptes par d\xE9faut en cours...");
      const password = await bcrypt3.hash("password123", 10);
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
      console.log("\u2705 Compte Administrateur cr\xE9\xE9 : admin@excellence.ci (mdp: password123)");
    }
    const courseCount = await prisma.course.count();
    if (courseCount === 0) {
      console.log("\u{1F504} Initialisation des formations par d\xE9faut...");
      await seedFormations();
      console.log("\u2705 Formations par d\xE9faut cr\xE9\xE9es avec succ\xE8s");
    }
  } catch (err) {
    console.error("Erreur initialisation admin / formations :", err);
  }
}
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  initDatabaseDefaults();
});
