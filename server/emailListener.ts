/**
 * 邮件监听服务 - 定时轮询邮箱，提取附件并处理订单
 */

import { recognizeExcelOrder, recognizeImageOrder, validateOrderData } from "./aiRecognition";
import {
  createOrder,
  createProcessingLog,
  getActiveEmailConfigs,
  updateEmailConfigLastSync,
  updateProcessingLogStatus,
} from "./db";
import { InsertOrder, InsertOrderItem } from "../drizzle/schema";

/**
 * 邮件监听服务状态
 */
interface EmailListenerStatus {
  isRunning: boolean;
  lastSyncTime?: Date;
  processedCount: number;
  errorCount: number;
}

let listenerStatus: EmailListenerStatus = {
  isRunning: false,
  processedCount: 0,
  errorCount: 0,
};

let listenerInterval: NodeJS.Timeout | null = null;

/**
 * 启动邮件监听服务
 */
export function startEmailListener(intervalSeconds: number = 30) {
  if (listenerStatus.isRunning) {
    console.log("[EmailListener] Already running");
    return;
  }

  console.log(`[EmailListener] Starting with interval: ${intervalSeconds}s`);
  listenerStatus.isRunning = true;

  // 立即执行一次
  processEmails().catch((error) => {
    console.error("[EmailListener] Error in initial processing:", error);
  });

  // 设置定时任务
  listenerInterval = setInterval(() => {
    processEmails().catch((error) => {
      console.error("[EmailListener] Error in scheduled processing:", error);
    });
  }, intervalSeconds * 1000);
}

/**
 * 停止邮件监听服务
 */
export function stopEmailListener() {
  if (listenerInterval) {
    clearInterval(listenerInterval);
    listenerInterval = null;
  }
  listenerStatus.isRunning = false;
  console.log("[EmailListener] Stopped");
}

/**
 * 获取监听服务状态
 */
export function getListenerStatus(): EmailListenerStatus {
  return { ...listenerStatus };
}

/**
 * 处理邮件（模拟实现）
 * 注意：实际的IMAP连接需要在生产环境中配置真实的邮箱凭证
 */
async function processEmails() {
  try {
    console.log("[EmailListener] Processing emails...");

    const configs = await getActiveEmailConfigs();
    if (configs.length === 0) {
      console.log("[EmailListener] No active email configs found");
      return;
    }

    for (const config of configs) {
      try {
        // 在实际生产环境中，这里应该使用真实的IMAP库连接邮箱
        // 例如：使用 imap-simple 或 node-imap
        // 目前使用模拟数据进行演示
        console.log(`[EmailListener] Processing config: ${config.configName}`);

        // 模拟：这里应该连接IMAP服务器，获取新邮件
        // const connection = await imaps.connect({
        //   imap: {
        //     host: config.imapHost,
        //     port: config.imapPort,
        //     user: config.imapUser,
        //     password: config.imapPassword,
        //     tls: config.useSsl === 1,
        //   }
        // });

        // 更新最后同步时间
        await updateEmailConfigLastSync(config.id);
        listenerStatus.lastSyncTime = new Date();
      } catch (error) {
        console.error(`[EmailListener] Error processing config ${config.configName}:`, error);
        listenerStatus.errorCount++;
      }
    }
  } catch (error) {
    console.error("[EmailListener] Error in processEmails:", error);
    listenerStatus.errorCount++;
  }
}

/**
 * 处理单个邮件附件
 */
export async function processEmailAttachment(params: {
  emailId: string;
  emailSubject: string;
  emailFrom: string;
  attachmentName: string;
  attachmentType: "excel" | "image" | "pdf" | "other";
  attachmentContent: string; // Excel数据或图片URL
}): Promise<{ success: boolean; orderId?: number; error?: string }> {
  const {
    emailId,
    emailSubject,
    emailFrom,
    attachmentName,
    attachmentType,
    attachmentContent,
  } = params;

  // 创建处理日志
  const logId = await createProcessingLog({
    emailId,
    emailSubject,
    emailFrom,
    attachmentName,
    attachmentType,
    processingStatus: "processing",
  });

  try {
    // 根据附件类型选择识别方法
    let recognizedOrder;
    if (attachmentType === "excel") {
      recognizedOrder = await recognizeExcelOrder(attachmentContent);
    } else if (attachmentType === "image") {
      recognizedOrder = await recognizeImageOrder(attachmentContent);
    } else {
      throw new Error(`Unsupported attachment type: ${attachmentType}`);
    }

    // 验证订单数据
    const validation = validateOrderData(recognizedOrder);
    const orderStatus = validation.isValid ? "pending" : "exception";

    // 准备订单数据
    const orderData: InsertOrder = {
      orderNumber: recognizedOrder.orderNumber || `AUTO-${Date.now()}`,
      customerName: recognizedOrder.customerName || "未知客户",
      customerEmail: recognizedOrder.customerEmail,
      orderDate: recognizedOrder.orderDate
        ? new Date(recognizedOrder.orderDate)
        : new Date(),
      deliveryDate: recognizedOrder.deliveryDate
        ? new Date(recognizedOrder.deliveryDate)
        : undefined,
      status: orderStatus,
      sourceEmailId: emailId,
      aiConfidence: recognizedOrder.confidence,
      notes: validation.errors.length > 0 ? validation.errors.join("; ") : undefined,
    };

    const orderItems: InsertOrderItem[] = recognizedOrder.items.map((item) => ({
      orderId: 0, // 将在createOrder中设置
      productCode: item.productCode,
      quantity: item.quantity,
      specification: item.specification,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    }));

    // 创建订单
    const orderId = await createOrder(orderData, orderItems);

    // 更新处理日志
    await updateProcessingLogStatus(
      logId,
      "success",
      undefined,
      JSON.stringify(recognizedOrder)
    );

    listenerStatus.processedCount++;

    return { success: true, orderId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[EmailListener] Error processing attachment:", error);

    // 更新处理日志
    await updateProcessingLogStatus(logId, "failed", errorMessage);

    listenerStatus.errorCount++;

    return { success: false, error: errorMessage };
  }
}

/**
 * 手动触发邮件同步
 */
export async function triggerManualSync(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    await processEmails();
    return {
      success: true,
      message: "邮件同步已触发",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `同步失败: ${errorMessage}`,
    };
  }
}
