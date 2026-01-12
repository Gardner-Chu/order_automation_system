/**
 * 模拟数据生成脚本 - 用于演示系统功能
 */

import {
  createOrder,
  createProcessingLog,
  upsertEmailConfig,
} from "./db";
import { InsertOrder, InsertOrderItem } from "../drizzle/schema";

/**
 * 生成模拟订单数据
 */
export async function seedOrders() {
  console.log("[SeedData] Generating mock orders...");

  const mockOrders = [
    {
      order: {
        orderNumber: "ORD-2024-001",
        customerName: "深圳市科技有限公司",
        customerEmail: "orders@shenzhentech.com",
        orderDate: new Date("2024-01-15"),
        deliveryDate: new Date("2024-02-15"),
        status: "confirmed" as const,
        sourceEmailId: "mock-email-001",
        aiConfidence: 95,
        notes: "AI识别置信度高，自动确认",
      },
      items: [
        {
          orderId: 0,
          productCode: "PROD-A001",
          quantity: 100,
          specification: "标准规格 10x20cm",
          unitPrice: 5000, // 50元
          totalPrice: 500000, // 5000元
        },
        {
          orderId: 0,
          productCode: "PROD-A002",
          quantity: 50,
          specification: "加强型 15x30cm",
          unitPrice: 8000, // 80元
          totalPrice: 400000, // 4000元
        },
      ],
    },
    {
      order: {
        orderNumber: "ORD-2024-002",
        customerName: "广州制造集团",
        customerEmail: "procurement@gzmanufacturing.com",
        orderDate: new Date("2024-01-16"),
        deliveryDate: new Date("2024-02-20"),
        status: "pending" as const,
        sourceEmailId: "mock-email-002",
        aiConfidence: 88,
        notes: undefined,
      },
      items: [
        {
          orderId: 0,
          productCode: "PROD-B001",
          quantity: 200,
          specification: "定制规格 12x25cm",
          unitPrice: 6500, // 65元
          totalPrice: 1300000, // 13000元
        },
      ],
    },
    {
      order: {
        orderNumber: "ORD-2024-003",
        customerName: "北京工业有限公司",
        customerEmail: "orders@bjindustry.com",
        orderDate: new Date("2024-01-17"),
        deliveryDate: new Date("2024-03-01"),
        status: "exception" as const,
        sourceEmailId: "mock-email-003",
        aiConfidence: 62,
        notes: "AI识别置信度较低 (62%); 缺少产品编码",
      },
      items: [
        {
          orderId: 0,
          productCode: "UNKNOWN",
          quantity: 150,
          specification: "标准型",
          unitPrice: undefined,
          totalPrice: undefined,
        },
      ],
    },
    {
      order: {
        orderNumber: "ORD-2024-004",
        customerName: "上海贸易公司",
        customerEmail: "purchasing@shtrade.com",
        orderDate: new Date("2024-01-18"),
        deliveryDate: new Date("2024-02-28"),
        status: "processing" as const,
        sourceEmailId: "mock-email-004",
        aiConfidence: 91,
        notes: undefined,
      },
      items: [
        {
          orderId: 0,
          productCode: "PROD-C001",
          quantity: 80,
          specification: "高级规格 20x40cm",
          unitPrice: 12000, // 120元
          totalPrice: 960000, // 9600元
        },
        {
          orderId: 0,
          productCode: "PROD-C002",
          quantity: 120,
          specification: "标准规格 10x20cm",
          unitPrice: 5500, // 55元
          totalPrice: 660000, // 6600元
        },
      ],
    },
    {
      order: {
        orderNumber: "ORD-2024-005",
        customerName: "杭州电子科技",
        customerEmail: "orders@hzelectronics.com",
        orderDate: new Date("2024-01-19"),
        deliveryDate: new Date("2024-02-25"),
        status: "completed" as const,
        sourceEmailId: "mock-email-005",
        aiConfidence: 97,
        notes: "订单已完成生产并发货",
      },
      items: [
        {
          orderId: 0,
          productCode: "PROD-D001",
          quantity: 300,
          specification: "精密型 8x16cm",
          unitPrice: 4500, // 45元
          totalPrice: 1350000, // 13500元
        },
      ],
    },
  ];

  for (const mockOrder of mockOrders) {
    try {
      await createOrder(mockOrder.order, mockOrder.items);
      console.log(`[SeedData] Created order: ${mockOrder.order.orderNumber}`);
    } catch (error) {
      console.error(`[SeedData] Error creating order ${mockOrder.order.orderNumber}:`, error);
    }
  }

  console.log("[SeedData] Mock orders created successfully");
}

/**
 * 生成模拟处理日志
 */
export async function seedProcessingLogs() {
  console.log("[SeedData] Generating mock processing logs...");

  const mockLogs = [
    {
      emailId: "mock-email-001",
      emailSubject: "订单确认 - 深圳市科技有限公司",
      emailFrom: "orders@shenzhentech.com",
      attachmentName: "order_20240115.xlsx",
      attachmentType: "excel" as const,
      processingStatus: "success" as const,
      aiResponse: JSON.stringify({
        orderNumber: "ORD-2024-001",
        customerName: "深圳市科技有限公司",
        confidence: 95,
      }),
    },
    {
      emailId: "mock-email-002",
      emailSubject: "采购订单 - 广州制造集团",
      emailFrom: "procurement@gzmanufacturing.com",
      attachmentName: "purchase_order.xlsx",
      attachmentType: "excel" as const,
      processingStatus: "success" as const,
      aiResponse: JSON.stringify({
        orderNumber: "ORD-2024-002",
        customerName: "广州制造集团",
        confidence: 88,
      }),
    },
    {
      emailId: "mock-email-003",
      emailSubject: "订单需求 - 北京工业",
      emailFrom: "orders@bjindustry.com",
      attachmentName: "order_image.jpg",
      attachmentType: "image" as const,
      processingStatus: "exception" as const,
      errorMessage: "AI识别置信度较低，需要人工审核",
      aiResponse: JSON.stringify({
        orderNumber: "ORD-2024-003",
        customerName: "北京工业有限公司",
        confidence: 62,
      }),
    },
    {
      emailId: "mock-email-004",
      emailSubject: "新订单 - 上海贸易公司",
      emailFrom: "purchasing@shtrade.com",
      attachmentName: "order_details.xlsx",
      attachmentType: "excel" as const,
      processingStatus: "success" as const,
      aiResponse: JSON.stringify({
        orderNumber: "ORD-2024-004",
        customerName: "上海贸易公司",
        confidence: 91,
      }),
    },
    {
      emailId: "mock-email-005",
      emailSubject: "采购需求 - 杭州电子科技",
      emailFrom: "orders@hzelectronics.com",
      attachmentName: "order_form.xlsx",
      attachmentType: "excel" as const,
      processingStatus: "success" as const,
      aiResponse: JSON.stringify({
        orderNumber: "ORD-2024-005",
        customerName: "杭州电子科技",
        confidence: 97,
      }),
    },
    {
      emailId: "mock-email-006",
      emailSubject: "订单附件损坏",
      emailFrom: "test@example.com",
      attachmentName: "corrupted_file.xlsx",
      attachmentType: "excel" as const,
      processingStatus: "failed" as const,
      errorMessage: "无法读取Excel文件，文件可能已损坏",
    },
  ];

  for (const log of mockLogs) {
    try {
      await createProcessingLog(log);
      console.log(`[SeedData] Created processing log: ${log.emailId}`);
    } catch (error) {
      console.error(`[SeedData] Error creating log ${log.emailId}:`, error);
    }
  }

  console.log("[SeedData] Mock processing logs created successfully");
}

/**
 * 生成模拟邮箱配置
 */
export async function seedEmailConfig() {
  console.log("[SeedData] Generating mock email config...");

  const mockConfig = {
    configName: "默认邮箱配置",
    imapHost: "imap.example.com",
    imapPort: 993,
    imapUser: "orders@factory.com",
    imapPassword: "encrypted_password_here", // 实际应用中应该加密
    useSsl: 1,
    folderName: "INBOX",
    fieldMapping: JSON.stringify({
      productCode: ["产品编码", "Product Code", "SKU", "货号"],
      quantity: ["数量", "Qty", "Quantity", "订购数量"],
      specification: ["规格", "Spec", "Specification", "型号"],
      deliveryDate: ["交期", "Delivery Date", "Due Date", "交货日期"],
      customerName: ["客户", "Customer", "客户名称", "公司名称"],
    }),
    isActive: 0, // 默认不激活，避免在演示环境中尝试连接真实邮箱
  };

  try {
    await upsertEmailConfig(mockConfig);
    console.log("[SeedData] Email config created successfully");
  } catch (error) {
    console.error("[SeedData] Error creating email config:", error);
  }
}

/**
 * 执行所有数据生成
 */
export async function seedAll() {
  console.log("[SeedData] Starting data seeding...");
  
  try {
    await seedEmailConfig();
    await seedOrders();
    await seedProcessingLogs();
    console.log("[SeedData] All mock data created successfully!");
  } catch (error) {
    console.error("[SeedData] Error during seeding:", error);
    throw error;
  }
}
