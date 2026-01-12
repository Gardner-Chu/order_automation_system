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
    onSuccess: () => {
      toast.success("配置已保存");
      refetch();
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
    fieldMapping: JSON.stringify(
      {
        productCode: ["产品编码", "Product Code", "SKU", "货号"],
        quantity: ["数量", "Qty", "Quantity", "订购数量"],
        specification: ["规格", "Spec", "Specification", "型号"],
        deliveryDate: ["交期", "Delivery Date", "Due Date", "交货日期"],
        customerName: ["客户", "Customer", "客户名称", "公司名称"],
      },
      null,
      2
    ),
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
        fieldMapping: config.fieldMapping
          ? JSON.stringify(JSON.parse(config.fieldMapping), null, 2)
          : JSON.stringify(
              {
                productCode: ["产品编码", "Product Code", "SKU", "货号"],
                quantity: ["数量", "Qty", "Quantity", "订购数量"],
                specification: ["规格", "Spec", "Specification", "型号"],
                deliveryDate: ["交期", "Delivery Date", "Due Date", "交货日期"],
                customerName: ["客户", "Customer", "客户名称", "公司名称"],
              },
              null,
              2
            ),
        isActive: config.isActive === 1,
      });
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证字段映射JSON格式
    try {
      JSON.parse(formData.fieldMapping);
    } catch (error) {
      toast.error("字段映射格式错误，请检查JSON格式");
      return;
    }

    await updateMutation.mutateAsync({
      configName: formData.configName,
      imapHost: formData.imapHost,
      imapPort: formData.imapPort,
      imapUser: formData.imapUser,
      imapPassword: formData.imapPassword,
      useSsl: formData.useSsl ? 1 : 0,
      folderName: formData.folderName,
      fieldMapping: formData.fieldMapping,
      isActive: formData.isActive ? 1 : 0,
    });
  };

  const handleTestConnection = () => {
    toast.info("连接测试功能即将推出");
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
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
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

          {/* 字段映射规则 */}
          <Card>
            <CardHeader>
              <CardTitle>字段映射规则</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fieldMapping">映射规则（JSON格式）</Label>
                <Textarea
                  id="fieldMapping"
                  value={formData.fieldMapping}
                  onChange={(e) =>
                    setFormData({ ...formData, fieldMapping: e.target.value })
                  }
                  rows={15}
                  className="font-mono text-sm"
                  placeholder={`{
  "productCode": ["产品编码", "Product Code"],
  "quantity": ["数量", "Qty"]
}`}
                />
                <p className="text-sm text-muted-foreground">
                  配置AI识别时的字段别名，支持多个别名。系统会尝试匹配这些别名来识别订单信息。
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  字段映射说明
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• productCode: 产品编码/SKU</li>
                  <li>• quantity: 订购数量</li>
                  <li>• specification: 产品规格/型号</li>
                  <li>• deliveryDate: 交货日期/交期</li>
                  <li>• customerName: 客户名称/公司名称</li>
                </ul>
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
