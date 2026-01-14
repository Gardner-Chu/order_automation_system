/**
 * 邮件监听服务 - 定时轮询邮箱，提取附件并处理订单
 */

import imaps from "imap-simple";
import { simpleParser } from "mailparser";
import { recognizeExcelOrder, recognizeImageOrder, validateOrderData } from "./aiRecognition";
import {
  createOrder,
  createProcessingLog,
  getActiveEmailConfigs,
  updateEmailConfigLastSync,
  updateProcessingLogStatus,
} from "./db";
import { InsertOrder, InsertOrderItem } from "../drizzle/schema";
import { storagePut } from "./storage";

/**
 * 邮件监听服务状态
 */
interface EmailListenerStatus {
  isRunning: boolean;
  lastSyncTime?: Date;
  processedCount: number;
  errorCount: number;
  lastError?: string;
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
    listenerStatus.lastError = error.message;
  });

  // 设置定时任务
  listenerInterval = setInterval(() => {
    processEmails().catch((error) => {
      console.error("[EmailListener] Error in scheduled processing:", error);
      listenerStatus.lastError = error.message;
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
 * 重启邮件监听服务
 */
export function restartEmailListener(intervalSeconds: number = 30) {
  console.log("[EmailListener] Restarting...");
  stopEmailListener();
  setTimeout(() => {
    startEmailListener(intervalSeconds);
  }, 1000);
}

/**
 * 获取监听服务状态
 */
export function getListenerStatus(): EmailListenerStatus {
  return { ...listenerStatus };
}

/**
 * 处理邮件 - 连接IMAP服务器并提取订单附件
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
      let connection: any = null;
      try {
        console.log(`[EmailListener] Processing config: ${config.configName}`);

        // 连接IMAP服务器，带重试机制
        let retries = 3;
        let lastError: Error | null = null;
        
        while (retries > 0) {
          try {
            connection = await imaps.connect({
              imap: {
                host: config.imapHost,
                port: config.imapPort,
                user: config.imapUser,
                password: config.imapPassword,
                tls: config.useSsl === 1,
                authTimeout: 10000,
              },
            });
            break; // 连接成功，退出重试循环
          } catch (error) {
            lastError = error as Error;
            retries--;
            if (retries > 0) {
              console.log(`[EmailListener] Connection failed, retrying... (${retries} attempts left)`);
              await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒后重试
            }
          }
        }
        
        if (!connection) {
          throw lastError || new Error("Failed to connect to IMAP server");
        }

        console.log(`[EmailListener] Connected to ${config.imapHost}`);

        // 打开收件箱
        await connection.openBox("INBOX");

        // 搜索未读邮件
        const searchCriteria = ["UNSEEN"];
        const fetchOptions = {
          bodies: ["HEADER", "TEXT", ""],
          markSeen: false, // 先不标记为已读，处理成功后再标记
        };

        const messages = await connection.search(searchCriteria, fetchOptions);
        console.log(`[EmailListener] Found ${messages.length} unread messages`);

        for (const message of messages) {
          try {
            await processMessage(message, config.id, connection);
          } catch (error) {
            console.error("[EmailListener] Error processing message:", error);
            listenerStatus.errorCount++;
          }
        }

        // 关闭连接
        if (connection) {
          connection.end();
        }

        // 更新最后同步时间
        await updateEmailConfigLastSync(config.id);
        listenerStatus.lastSyncTime = new Date();
        
        console.log(`[EmailListener] Successfully processed config: ${config.configName}`);
      } catch (error) {
        console.error(`[EmailListener] Error processing config ${config.configName}:`, error);
        listenerStatus.errorCount++;
        listenerStatus.lastError = error instanceof Error ? error.message : String(error);
        
        // 尝试关闭连接
        if (connection) {
          try {
            connection.end();
          } catch (closeError) {
            console.error(`[EmailListener] Error closing connection:`, closeError);
          }
        }
      }
    }
  } catch (error) {
    console.error("[EmailListener] Error in processEmails:", error);
    listenerStatus.errorCount++;
    listenerStatus.lastError = error instanceof Error ? error.message : String(error);
  }
}

/**
 * 处理单封邮件
 */
async function processMessage(message: any, configId: number, connection: any) {
  const all = message.parts.find((part: any) => part.which === "");
  const id = message.attributes.uid;
  const idHeader = `Imap-Id: ${id}\r\n`;

  // 解析邮件
  const mail = await simpleParser(idHeader + all.body);

  const emailId = `${configId}-${id}`;
  const emailSubject = mail.subject || "无主题";
  const emailFrom = mail.from?.text || "未知发件人";

  console.log(`[EmailListener] Processing email: ${emailSubject} from ${emailFrom}`);

  // 检查是否有附件
  if (!mail.attachments || mail.attachments.length === 0) {
    console.log(`[EmailListener] No attachments in email ${emailId}`);
    // 标记为已读
    await connection.addFlags(id, ["\\Seen"]);
    return;
  }

  // 处理每个附件
  for (const attachment of mail.attachments) {
    try {
      const attachmentName = attachment.filename || "未命名附件";
      const contentType = attachment.contentType.toLowerCase();

      console.log(`[EmailListener] Processing attachment: ${attachmentName} (${contentType})`);

      // 判断附件类型
      let attachmentType: "excel" | "image" | "pdf" | "other";
      if (
        contentType.includes("excel") ||
        contentType.includes("spreadsheet") ||
        attachmentName.endsWith(".xlsx") ||
        attachmentName.endsWith(".xls")
      ) {
        attachmentType = "excel";
      } else if (contentType.includes("image") || /\.(jpg|jpeg|png|gif|bmp)$/i.test(attachmentName)) {
        attachmentType = "image";
      } else if (contentType.includes("pdf") || attachmentName.endsWith(".pdf")) {
        attachmentType = "pdf";
      } else {
        attachmentType = "other";
        console.log(`[EmailListener] Skipping unsupported attachment type: ${contentType}`);
        continue;
      }

      // 上传附件到S3，带重试机制
      let attachmentUrl: string = "";
      let uploadRetries = 3;
      let uploadError: Error | null = null;
      
      while (uploadRetries > 0) {
        try {
          const fileKey = `email-attachments/${configId}/${Date.now()}-${attachmentName}`;
          const result = await storagePut(
            fileKey,
            attachment.content,
            attachment.contentType
          );
          attachmentUrl = result.url;
          console.log(`[EmailListener] Uploaded attachment to S3: ${attachmentUrl}`);
          break;
        } catch (error) {
          uploadError = error as Error;
          uploadRetries--;
          if (uploadRetries > 0) {
            console.log(`[EmailListener] Upload failed, retrying... (${uploadRetries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      if (!attachmentUrl) {
        throw uploadError || new Error("Failed to upload attachment to S3");
      }

      // 处理附件
      await processEmailAttachment({
        emailId,
        emailSubject,
        emailFrom,
        attachmentName,
        attachmentType,
        attachmentUrl,
        attachmentContent: attachment.content,
      });

      listenerStatus.processedCount++;
    } catch (error) {
      console.error(`[EmailListener] Error processing attachment:`, error);
      listenerStatus.errorCount++;
    }
  }

  // 标记邮件为已读
  await connection.addFlags(id, ["\\Seen"]);
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
  attachmentUrl: string;
  attachmentContent: Buffer | string; // Buffer from IMAP or base64 string from API
}): Promise<{ success: boolean; orderId?: number; error?: string }> {
  const {
    emailId,
    emailSubject,
    emailFrom,
    attachmentName,
    attachmentType,
    attachmentUrl,
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
      // 对于Excel，传递base64编码的内容
      const base64Content = Buffer.isBuffer(attachmentContent)
        ? attachmentContent.toString("base64")
        : attachmentContent;
      recognizedOrder = await recognizeExcelOrder(base64Content);
    } else if (attachmentType === "image") {
      // 对于图片，使用S3 URL
      recognizedOrder = await recognizeImageOrder(attachmentUrl);
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
      orderDate: recognizedOrder.orderDate ? new Date(recognizedOrder.orderDate) : new Date(),
      deliveryDate: recognizedOrder.deliveryDate
        ? new Date(recognizedOrder.deliveryDate)
        : undefined,
      status: orderStatus,
      sourceEmailId: emailId,
      aiConfidence: recognizedOrder.confidence,
      attachmentUrls: attachmentUrl, // 存储附件URL
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
    await updateProcessingLogStatus(logId, "success", undefined, JSON.stringify(recognizedOrder));

    console.log(`[EmailListener] Successfully created order ${orderId} from email ${emailId}`);

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

/**
 * 测试IMAP连接
 */
export async function testImapConnection(params: {
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
  useSsl: boolean;
}): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`[EmailListener] Testing IMAP connection to ${params.imapHost}:${params.imapPort}`);

    const connection = await imaps.connect({
      imap: {
        host: params.imapHost,
        port: params.imapPort,
        user: params.imapUser,
        password: params.imapPassword,
        tls: params.useSsl,
        authTimeout: 10000,
      },
    });

    // 尝试打开收件箱
    await connection.openBox("INBOX");

    // 关闭连接
    connection.end();

    console.log(`[EmailListener] IMAP connection test successful`);

    return {
      success: true,
      message: "IMAP连接测试成功！",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[EmailListener] IMAP connection test failed:", error);

    return {
      success: false,
      message: `IMAP连接失败: ${errorMessage}`,
    };
  }
}
