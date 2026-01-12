/**
 * AI识别引擎 - 使用LLM识别Excel和图片中的订单信息
 */

import { invokeLLM } from "./_core/llm";

/**
 * 订单识别结果接口
 */
export interface RecognizedOrder {
  orderNumber?: string;
  customerName?: string;
  customerEmail?: string;
  orderDate?: string;
  deliveryDate?: string;
  items: Array<{
    productCode: string;
    quantity: number;
    specification?: string;
    unitPrice?: number;
    totalPrice?: number;
  }>;
  confidence: number; // 0-100
  rawData?: any;
}

/**
 * 识别Excel表格中的订单信息
 */
export async function recognizeExcelOrder(
  excelData: string,
  fieldMapping?: Record<string, string[]>
): Promise<RecognizedOrder> {
  const systemPrompt = `你是一个专业的订单数据提取助手。你的任务是从Excel表格数据中提取订单信息。

请提取以下字段：
- orderNumber: 订单号
- customerName: 客户名称
- customerEmail: 客户邮箱
- orderDate: 订单日期（ISO 8601格式）
- deliveryDate: 交期（ISO 8601格式）
- items: 订单项目数组，每个项目包含：
  - productCode: 产品编码
  - quantity: 数量（整数）
  - specification: 规格
  - unitPrice: 单价（分，整数）
  - totalPrice: 总价（分，整数）

${fieldMapping ? `\n字段映射规则：\n${JSON.stringify(fieldMapping, null, 2)}\n` : ""}

请返回JSON格式的结果，并评估识别的置信度（0-100）。`;

  const userPrompt = `请从以下Excel数据中提取订单信息：

\`\`\`
${excelData}
\`\`\`

请严格按照以下JSON格式返回：
{
  "orderNumber": "订单号",
  "customerName": "客户名称",
  "customerEmail": "客户邮箱",
  "orderDate": "2024-01-01T00:00:00Z",
  "deliveryDate": "2024-01-15T00:00:00Z",
  "items": [
    {
      "productCode": "产品编码",
      "quantity": 数量,
      "specification": "规格",
      "unitPrice": 单价（分）,
      "totalPrice": 总价（分）
    }
  ],
  "confidence": 置信度（0-100）
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "order_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              orderNumber: { type: "string" },
              customerName: { type: "string" },
              customerEmail: { type: "string" },
              orderDate: { type: "string" },
              deliveryDate: { type: "string" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    productCode: { type: "string" },
                    quantity: { type: "integer" },
                    specification: { type: "string" },
                    unitPrice: { type: "integer" },
                    totalPrice: { type: "integer" },
                  },
                  required: ["productCode", "quantity"],
                  additionalProperties: false,
                },
              },
              confidence: { type: "integer" },
            },
            required: ["items", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from LLM");
    }

    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const result = JSON.parse(contentStr);
    return {
      ...result,
      rawData: excelData,
    };
  } catch (error) {
    console.error("Error recognizing Excel order:", error);
    throw error;
  }
}

/**
 * 识别图片中的订单信息
 */
export async function recognizeImageOrder(
  imageUrl: string,
  fieldMapping?: Record<string, string[]>
): Promise<RecognizedOrder> {
  const systemPrompt = `你是一个专业的订单数据提取助手。你的任务是从图片中识别并提取订单信息。

请提取以下字段：
- orderNumber: 订单号
- customerName: 客户名称
- customerEmail: 客户邮箱
- orderDate: 订单日期（ISO 8601格式）
- deliveryDate: 交期（ISO 8601格式）
- items: 订单项目数组，每个项目包含：
  - productCode: 产品编码
  - quantity: 数量（整数）
  - specification: 规格
  - unitPrice: 单价（分，整数）
  - totalPrice: 总价（分，整数）

${fieldMapping ? `\n字段映射规则：\n${JSON.stringify(fieldMapping, null, 2)}\n` : ""}

请返回JSON格式的结果，并评估识别的置信度（0-100）。`;

  const userPrompt = `请从图片中提取订单信息。

请严格按照以下JSON格式返回：
{
  "orderNumber": "订单号",
  "customerName": "客户名称",
  "customerEmail": "客户邮箱",
  "orderDate": "2024-01-01T00:00:00Z",
  "deliveryDate": "2024-01-15T00:00:00Z",
  "items": [
    {
      "productCode": "产品编码",
      "quantity": 数量,
      "specification": "规格",
      "unitPrice": 单价（分）,
      "totalPrice": 总价（分）
    }
  ],
  "confidence": 置信度（0-100）
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "order_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              orderNumber: { type: "string" },
              customerName: { type: "string" },
              customerEmail: { type: "string" },
              orderDate: { type: "string" },
              deliveryDate: { type: "string" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    productCode: { type: "string" },
                    quantity: { type: "integer" },
                    specification: { type: "string" },
                    unitPrice: { type: "integer" },
                    totalPrice: { type: "integer" },
                  },
                  required: ["productCode", "quantity"],
                  additionalProperties: false,
                },
              },
              confidence: { type: "integer" },
            },
            required: ["items", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from LLM");
    }

    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const result = JSON.parse(contentStr);
    return {
      ...result,
      rawData: { imageUrl },
    };
  } catch (error) {
    console.error("Error recognizing image order:", error);
    throw error;
  }
}

/**
 * 验证订单数据完整性
 */
export function validateOrderData(order: RecognizedOrder): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 检查必填字段
  if (!order.customerName) {
    errors.push("缺少客户名称");
  }

  if (!order.items || order.items.length === 0) {
    errors.push("缺少订单项目");
  }

  // 检查订单项目
  order.items?.forEach((item, index) => {
    if (!item.productCode) {
      errors.push(`订单项目 ${index + 1} 缺少产品编码`);
    }
    if (!item.quantity || item.quantity <= 0) {
      errors.push(`订单项目 ${index + 1} 数量无效`);
    }
  });

  // 检查置信度
  if (order.confidence < 70) {
    errors.push(`AI识别置信度较低 (${order.confidence}%)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
