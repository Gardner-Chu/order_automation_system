import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { RefreshCw, Save, TestTube } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { data: config, isLoading, refetch } = trpc.emailConfig.get.useQuery();
  const updateMutation = trpc.emailConfig.upsert.useMutation({
    onSuccess: (data) => {
      // 显示成功消息，包含服务重启信息
      toast.success(data.message || "配置已保存");
      // 不调用refetch()，避免表单重置
      // 用户可以手动点击刷新按钮来重新加载配置
    },
    onError: () => {
      toast.error("保存失败");
    },
  });

  const [formData, setFormData] = useState({
    configName: "",
    imapHost: "",
    imapPort: 993,
    imapUser: "",
    imapPassword: "",
    useSsl: true,
    folderName: "INBOX",
    confidenceThreshold: 70,
    isActive: false,
  });

  useEffect(() => {
    if (config) {
      setFormData({
        configName: config.configName || "",
        imapHost: config.imapHost || "",
        imapPort: config.imapPort || 993,
        imapUser: config.imapUser || "",
        imapPassword: config.imapPassword || "",
        useSsl: config.useSsl === 1,
        folderName: config.folderName || "INBOX",
        confidenceThreshold: 70,
        isActive: config.isActive === 1,
      });
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await updateMutation.mutateAsync({
      configName: formData.configName,
      imapHost: formData.imapHost,
      imapPort: formData.imapPort,
      imapUser: formData.imapUser,
      imapPassword: formData.imapPassword,
      useSsl: formData.useSsl ? 1 : 0,
      folderName: formData.folderName,
      fieldMapping: "", // 不再需要字段映射
      isActive: formData.isActive ? 1 : 0,
    });
  };

  const testConnectionMutation = trpc.emailConfig.testConnection.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(`测试失败: ${error.message}`);
    },
  });

  const handleTestConnection = async () => {
    if (!formData.imapHost || !formData.imapUser || !formData.imapPassword) {
      toast.error("请先填写IMAP服务器信息");
      return;
    }

    await testConnectionMutation.mutateAsync({
      imapHost: formData.imapHost,
      imapPort: formData.imapPort,
      imapUser: formData.imapUser,
      imapPassword: formData.imapPassword,
      useSsl: formData.useSsl,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">邮箱配置</h1>
            <p className="text-muted-foreground mt-1">
              配置IMAP邮箱连接和字段映射规则
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={testConnectionMutation.isPending}
            >
              <TestTube className="h-4 w-4 mr-2" />
              {testConnectionMutation.isPending ? "测试中..." : "测试连接"}
            </Button>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本配置 */}
          <Card>
            <CardHeader>
              <CardTitle>基本配置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="configName">配置名称</Label>
                  <Input
                    id="configName"
                    value={formData.configName}
                    onChange={(e) =>
                      setFormData({ ...formData, configName: e.target.value })
                    }
                    placeholder="例如：默认邮箱配置"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="folderName">邮箱文件夹</Label>
                  <Input
                    id="folderName"
                    value={formData.folderName}
                    onChange={(e) =>
                      setFormData({ ...formData, folderName: e.target.value })
                    }
                    placeholder="INBOX"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label htmlFor="isActive">启用此配置</Label>
              </div>
            </CardContent>
          </Card>

          {/* IMAP配置 */}
          <Card>
            <CardHeader>
              <CardTitle>IMAP服务器配置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="imapHost">IMAP服务器地址</Label>
                  <Input
                    id="imapHost"
                    value={formData.imapHost}
                    onChange={(e) =>
                      setFormData({ ...formData, imapHost: e.target.value })
                    }
                    placeholder="imap.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imapPort">端口</Label>
                  <Input
                    id="imapPort"
                    type="number"
                    value={formData.imapPort}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        imapPort: parseInt(e.target.value),
                      })
                    }
                    placeholder="993"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imapUser">用户名</Label>
                  <Input
                    id="imapUser"
                    value={formData.imapUser}
                    onChange={(e) =>
                      setFormData({ ...formData, imapUser: e.target.value })
                    }
                    placeholder="orders@factory.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imapPassword">密码</Label>
                  <Input
                    id="imapPassword"
                    type="password"
                    value={formData.imapPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, imapPassword: e.target.value })
                    }
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="useSsl"
                  checked={formData.useSsl}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, useSsl: checked })
                  }
                />
                <Label htmlFor="useSsl">使用SSL加密连接</Label>
              </div>
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  测试连接
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI配置 */}
          <Card>
            <CardHeader>
              <CardTitle>AI识别配置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="confidenceThreshold">
                  置信度阈值（{formData.confidenceThreshold}%）
                </Label>
                <Input
                  id="confidenceThreshold"
                  type="range"
                  min="0"
                  max="100"
                  value={formData.confidenceThreshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confidenceThreshold: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  当AI识别置信度低于此阈值时，订单将被标记为“异常”状态，需要人工审核。
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-green-900 mb-2">
                  🤖 AI Agent自主识别
                </h4>
                <p className="text-sm text-green-800">
                  系统使用先进AI技术自主理解订单格式，无需预先配置字段映射规则。AI会智能识别以下字段：订单号、客户名称、产品编码、数量、规格、交期等，并自动适应不同客户的订单格式。
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 提交按钮 */}
          <div className="flex justify-end gap-3">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="min-w-[120px]"
            >
              {updateMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              保存配置
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
