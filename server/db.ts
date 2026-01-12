import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  orders, 
  orderItems, 
  processingLog, 
  emailConfig,
  InsertOrder,
  InsertOrderItem,
  InsertProcessingLog,
  InsertEmailConfig
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== 订单相关查询 ====================

/**
 * 创建订单（包括订单项目）
 */
export async function createOrder(
  orderData: InsertOrder,
  items: InsertOrderItem[]
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(orders).values(orderData);
  const orderId = Number(result[0].insertId);

  if (items.length > 0) {
    const itemsWithOrderId = items.map(item => ({ ...item, orderId }));
    await db.insert(orderItems).values(itemsWithOrderId);
  }

  return orderId;
}

/**
 * 获取订单列表（支持分页和状态筛选）
 */
export async function getOrders(params: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const { status, limit = 50, offset = 0 } = params;

  if (status) {
    const result = await db
      .select()
      .from(orders)
      .where(eq(orders.status, status as any))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);
    return result;
  }

  const result = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);

  return result;
}

/**
 * 获取订单详情（包括订单项目）
 */
export async function getOrderById(orderId: number) {
  const db = await getDb();
  if (!db) return null;

  const orderResult = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (orderResult.length === 0) return null;

  const itemsResult = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));

  return {
    order: orderResult[0],
    items: itemsResult,
  };
}

/**
 * 更新订单状态
 */
export async function updateOrderStatus(orderId: number, status: string, notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = { status };
  if (notes !== undefined) {
    updateData.notes = notes;
  }

  await db.update(orders).set(updateData).where(eq(orders.id, orderId));
}

/**
 * 更新订单信息
 */
export async function updateOrder(orderId: number, data: Partial<InsertOrder>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(orders).set(data).where(eq(orders.id, orderId));
}

/**
 * 获取仪表板统计数据
 */
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return null;

  const allOrders = await db.select().from(orders);
  const allLogs = await db.select().from(processingLog);

  const totalOrders = allOrders.length;
  const pendingOrders = allOrders.filter(o => o.status === "pending").length;
  const exceptionOrders = allOrders.filter(o => o.status === "exception").length;
  const completedOrders = allOrders.filter(o => o.status === "completed").length;

  const totalProcessed = allLogs.length;
  const successfulProcessed = allLogs.filter(l => l.processingStatus === "success").length;
  const failedProcessed = allLogs.filter(l => l.processingStatus === "failed").length;

  return {
    totalOrders,
    pendingOrders,
    exceptionOrders,
    completedOrders,
    totalProcessed,
    successfulProcessed,
    failedProcessed,
    successRate: totalProcessed > 0 ? Math.round((successfulProcessed / totalProcessed) * 100) : 0,
  };
}

// ==================== 处理日志相关查询 ====================

/**
 * 创建处理日志
 */
export async function createProcessingLog(logData: InsertProcessingLog): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(processingLog).values(logData);
  return Number(result[0].insertId);
}

/**
 * 获取处理日志列表
 */
export async function getProcessingLogs(params: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const { status, limit = 50, offset = 0 } = params;

  if (status) {
    const result = await db
      .select()
      .from(processingLog)
      .where(eq(processingLog.processingStatus, status as any))
      .orderBy(desc(processingLog.createdAt))
      .limit(limit)
      .offset(offset);
    return result;
  }

  const result = await db
    .select()
    .from(processingLog)
    .orderBy(desc(processingLog.createdAt))
    .limit(limit)
    .offset(offset);

  return result;
}

/**
 * 更新处理日志状态
 */
export async function updateProcessingLogStatus(
  logId: number,
  status: string,
  errorMessage?: string,
  aiResponse?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = { processingStatus: status };
  if (errorMessage !== undefined) {
    updateData.errorMessage = errorMessage;
  }
  if (aiResponse !== undefined) {
    updateData.aiResponse = aiResponse;
  }

  await db.update(processingLog).set(updateData).where(eq(processingLog.id, logId));
}

// ==================== 邮箱配置相关查询 ====================

/**
 * 获取活跃的邮箱配置
 */
export async function getActiveEmailConfigs() {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(emailConfig).where(eq(emailConfig.isActive, 1));
  return result;
}

/**
 * 创建或更新邮箱配置
 */
export async function upsertEmailConfig(configData: InsertEmailConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(emailConfig)
    .where(eq(emailConfig.configName, configData.configName))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(emailConfig)
      .set(configData)
      .where(eq(emailConfig.configName, configData.configName));
  } else {
    await db.insert(emailConfig).values(configData);
  }
}

/**
 * 更新邮箱配置的最后同步时间
 */
export async function updateEmailConfigLastSync(configId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(emailConfig)
    .set({ lastSyncAt: new Date() })
    .where(eq(emailConfig.id, configId));
}
