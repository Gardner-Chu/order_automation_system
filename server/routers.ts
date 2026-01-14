import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // 订单管理
  orders: router({
    list: protectedProcedure
      .input(
        z.object({
          status: z.string().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        const { getOrders } = await import("./db");
        return getOrders(input);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { getOrderById } = await import("./db");
        return getOrderById(input.id);
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.string(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { updateOrderStatus } = await import("./db");
        await updateOrderStatus(input.id, input.status, input.notes);
        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          customerName: z.string().optional(),
          customerEmail: z.string().optional(),
          orderDate: z.date().optional(),
          deliveryDate: z.date().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const { updateOrder } = await import("./db");
        await updateOrder(id, data);
        return { success: true };
      }),
  }),

  // 处理日志
  processingLog: router({
    list: protectedProcedure
      .input(
        z.object({
          status: z.string().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        const { getProcessingLogs } = await import("./db");
        return getProcessingLogs(input);
      }),
  }),

  // 仪表板统计
  dashboard: router({
    stats: protectedProcedure.query(async () => {
      const { getDashboardStats } = await import("./db");
      return getDashboardStats();
    }),
  }),

  // 邮件监听服务
  email: router({
    status: protectedProcedure.query(async () => {
      const { getListenerStatus } = await import("./emailListener");
      return getListenerStatus();
    }),

    start: protectedProcedure
      .input(z.object({ intervalSeconds: z.number().optional() }))
      .mutation(async ({ input }) => {
        const { startEmailListener } = await import("./emailListener");
        startEmailListener(input.intervalSeconds);
        return { success: true, message: "邮件监听服务已启动" };
      }),

    stop: protectedProcedure.mutation(async () => {
      const { stopEmailListener } = await import("./emailListener");
      stopEmailListener();
      return { success: true, message: "邮件监听服务已停止" };
    }),

    sync: protectedProcedure.mutation(async () => {
      const { triggerManualSync } = await import("./emailListener");
      return triggerManualSync();
    }),

    processAttachment: protectedProcedure
      .input(
        z.object({
          emailId: z.string(),
          emailSubject: z.string(),
          emailFrom: z.string(),
          attachmentName: z.string(),
          attachmentType: z.enum(["excel", "image", "pdf", "other"]),
          attachmentUrl: z.string(),
          attachmentContent: z.string(), // base64 encoded
        })
      )
      .mutation(async ({ input }) => {
        const { processEmailAttachment } = await import("./emailListener");
        return processEmailAttachment(input);
      }),
  }),

  // 邮箱配置管理
  emailConfig: router({
    get: protectedProcedure.query(async () => {
      const { getEmailConfig } = await import("./db");
      return getEmailConfig();
    }),
    upsert: protectedProcedure
      .input(
        z.object({
          configName: z.string(),
          imapHost: z.string(),
          imapPort: z.number(),
          imapUser: z.string(),
          imapPassword: z.string(),
          useSsl: z.number(),
          folderName: z.string(),
          fieldMapping: z.string(),
          isActive: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        const { upsertEmailConfig } = await import("./db");
        await upsertEmailConfig(input);
        
        // 配置更新后重启邮件监听服务
        const { restartEmailListener } = await import("./emailListener");
        restartEmailListener(30);
        
        return { success: true, message: "配置已保存，邮件监听服务已重启" };
      }),
    
    testConnection: protectedProcedure
      .input(
        z.object({
          imapHost: z.string(),
          imapPort: z.number(),
          imapUser: z.string(),
          imapPassword: z.string(),
          useSsl: z.boolean(),
        })
      )
      .mutation(async ({ input }) => {
        const { testImapConnection } = await import("./emailListener");
        return testImapConnection(input);
      }),
  }),

  // 测试数据生成
  seed: router({
    all: protectedProcedure.mutation(async () => {
      const { seedAll } = await import("./seedData");
      await seedAll();
      return { success: true, message: "模拟数据已生成" };
    }),
  }),

  // 订单批注
  orderComment: router({
    create: protectedProcedure
      .input(
        z.object({
          orderId: z.number(),
          comment: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { createOrderComment, createOrderHistory } = await import("./db");
        const commentId = await createOrderComment({
          orderId: input.orderId,
          userId: ctx.user.id,
          userName: ctx.user.name || "匿名用户",
          comment: input.comment,
        });

        // 记录历史
        await createOrderHistory({
          orderId: input.orderId,
          userId: ctx.user.id,
          userName: ctx.user.name || "匿名用户",
          action: "updated",
          fieldName: "comment",
          oldValue: null,
          newValue: input.comment,
        });

        return { commentId };
      }),

    list: publicProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input }) => {
        const { getOrderComments } = await import("./db");
        return await getOrderComments(input.orderId);
      }),

    delete: protectedProcedure
      .input(z.object({ commentId: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteOrderComment } = await import("./db");
        await deleteOrderComment(input.commentId);
        return { success: true };
      }),
  }),

  // 订单修改历史
  orderHistory: router({
    list: publicProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input }) => {
        const { getOrderHistory } = await import("./db");
        return await getOrderHistory(input.orderId);
      }),
  }),

  // 批量操作
  batchOperations: router({
    confirmOrders: protectedProcedure
      .input(z.object({ orderIds: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        const { batchConfirmOrders } = await import("./db");
        await batchConfirmOrders(
          input.orderIds,
          ctx.user.id,
          ctx.user.name || "匿名用户"
        );
        return { success: true, count: input.orderIds.length };
      }),

    exportOrders: protectedProcedure
      .input(
        z.object({
          orderIds: z.array(z.number()).optional(),
          status: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const { getOrders } = await import("./db");
        const orders = await getOrders({
          status: input.status,
          limit: 1000,
        });
        // 返回JSON数据，前端负责转换为Excel
        return orders;
      }),
  }),

  // AI统计
  aiStats: router({
    accuracy: publicProcedure.query(async () => {
      const { getAIAccuracyStats } = await import("./db");
      return await getAIAccuracyStats();
    }),

    trend: publicProcedure
      .input(z.object({ days: z.number().optional() }))
      .query(async ({ input }) => {
        const { getAIAccuracyTrend } = await import("./db");
        return await getAIAccuracyTrend(input.days || 7);
      }),
  }),
});

export type AppRouter = typeof appRouter;
