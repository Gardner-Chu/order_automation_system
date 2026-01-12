import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 订单表 - 存储订单基本信息
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 100 }).notNull().unique(),
  customerName: varchar("customerName", { length: 200 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }),
  orderDate: timestamp("orderDate").notNull(),
  deliveryDate: timestamp("deliveryDate"),
  status: mysqlEnum("status", ["pending", "confirmed", "processing", "completed", "exception"]).default("pending").notNull(),
  sourceEmailId: varchar("sourceEmailId", { length: 200 }),
  aiConfidence: int("aiConfidence"), // 0-100
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * 订单项目表 - 存储订单详细项目
 */
export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productCode: varchar("productCode", { length: 100 }).notNull(),
  quantity: int("quantity").notNull(),
  specification: varchar("specification", { length: 500 }),
  unitPrice: int("unitPrice"), // 存储为分（cents）
  totalPrice: int("totalPrice"), // 存储为分（cents）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * 处理日志表 - 记录邮件处理状态和AI识别结果
 */
export const processingLog = mysqlTable("processingLog", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId"),
  emailId: varchar("emailId", { length: 200 }).notNull(),
  emailSubject: varchar("emailSubject", { length: 500 }),
  emailFrom: varchar("emailFrom", { length: 320 }),
  attachmentName: varchar("attachmentName", { length: 500 }),
  attachmentType: mysqlEnum("attachmentType", ["excel", "image", "pdf", "other"]),
  processingStatus: mysqlEnum("processingStatus", ["pending", "processing", "success", "failed", "exception"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  aiResponse: text("aiResponse"), // JSON string
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProcessingLog = typeof processingLog.$inferSelect;
export type InsertProcessingLog = typeof processingLog.$inferInsert;

/**
 * 邮箱配置表 - 存储IMAP配置和字段映射规则
 */
export const emailConfig = mysqlTable("emailConfig", {
  id: int("id").autoincrement().primaryKey(),
  configName: varchar("configName", { length: 100 }).notNull().unique(),
  imapHost: varchar("imapHost", { length: 200 }).notNull(),
  imapPort: int("imapPort").notNull().default(993),
  imapUser: varchar("imapUser", { length: 320 }).notNull(),
  imapPassword: text("imapPassword").notNull(), // 应该加密存储
  useSsl: int("useSsl").notNull().default(1), // 1 = true, 0 = false
  folderName: varchar("folderName", { length: 100 }).default("INBOX").notNull(),
  fieldMapping: text("fieldMapping"), // JSON string for field mapping rules
  isActive: int("isActive").notNull().default(1), // 1 = true, 0 = false
  lastSyncAt: timestamp("lastSyncAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailConfig = typeof emailConfig.$inferSelect;
export type InsertEmailConfig = typeof emailConfig.$inferInsert;