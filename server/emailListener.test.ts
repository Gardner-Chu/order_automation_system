import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  startEmailListener,
  stopEmailListener,
  getListenerStatus,
  testImapConnection,
} from "./emailListener";

describe("Email Listener Service", () => {
  beforeEach(() => {
    // 停止任何运行中的监听器
    stopEmailListener();
  });

  afterEach(() => {
    // 清理
    stopEmailListener();
  });

  it("should start the email listener service", () => {
    startEmailListener(30);
    const status = getListenerStatus();
    expect(status.isRunning).toBe(true);
  });

  it("should stop the email listener service", () => {
    startEmailListener(30);
    stopEmailListener();
    const status = getListenerStatus();
    expect(status.isRunning).toBe(false);
  });

  it("should not start multiple instances", () => {
    startEmailListener(30);
    const status1 = getListenerStatus();
    
    // 尝试再次启动
    startEmailListener(30);
    const status2 = getListenerStatus();
    
    expect(status1.isRunning).toBe(true);
    expect(status2.isRunning).toBe(true);
    // 确保只有一个实例在运行
    expect(status1.processedCount).toBe(status2.processedCount);
  });

  it("should return listener status", () => {
    const status = getListenerStatus();
    expect(status).toHaveProperty("isRunning");
    expect(status).toHaveProperty("processedCount");
    expect(status).toHaveProperty("errorCount");
  });

  it("should handle IMAP connection test with invalid credentials", async () => {
    const result = await testImapConnection({
      imapHost: "invalid.host.com",
      imapPort: 993,
      imapUser: "test@example.com",
      imapPassword: "wrongpassword",
      useSsl: true,
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("IMAP连接失败");
  });
});
