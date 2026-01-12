import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { RefreshCw, Eye, CheckSquare, Download, CheckCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useLocation } from "wouter";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  confirmed: "bg-blue-100 text-blue-800 border-blue-300",
  processing: "bg-purple-100 text-purple-800 border-purple-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  exception: "bg-red-100 text-red-800 border-red-300",
};

const statusLabels = {
  pending: "待处理",
  confirmed: "已确认",
  processing: "处理中",
  completed: "已完成",
  exception: "异常",
};

export default function Orders() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const { data: orders, isLoading, refetch } = trpc.orders.list.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 50,
    offset: 0,
  });

  const batchConfirmMutation = trpc.batchOperations.confirmOrders.useMutation({
    onSuccess: (data) => {
      toast.success(`已批量确认 ${data.count} 个订单`);
      setSelectedOrders([]);
      refetch();
    },
    onError: () => {
      toast.error("批量确认失败");
    },
  });

  const handleSelectAll = () => {
    if (selectedOrders.length === orders?.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders?.map(o => o.id) || []);
    }
  };

  const handleSelectOrder = (orderId: number) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleBatchConfirm = () => {
    if (selectedOrders.length === 0) {
      toast.error("请选择要确认的订单");
      return;
    }
    if (confirm(`确定要批量确认 ${selectedOrders.length} 个订单吗？`)) {
      batchConfirmMutation.mutate({ orderIds: selectedOrders });
    }
  };

  const handleExport = async () => {
    toast.info("正在导出数据...");
    // 这里可以调用导出API，然后转换为Excel
    // 简化处理：直接下载JSON
    const dataStr = JSON.stringify(orders, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("导出成功");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">订单管理</h1>
            <p className="text-muted-foreground mt-1">
              查看和管理所有订单信息
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>订单列表</CardTitle>
              <div className="flex items-center gap-2">
                {selectedOrders.length > 0 && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleBatchConfirm}
                      disabled={batchConfirmMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      批量确认 ({selectedOrders.length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExport}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      导出
                    </Button>
                  </>
                )}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="筛选状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="pending">待处理</SelectItem>
                    <SelectItem value="confirmed">已确认</SelectItem>
                    <SelectItem value="processing">处理中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="exception">异常</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : orders && orders.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedOrders.length === orders?.length && orders.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>订单号</TableHead>
                      <TableHead>客户名称</TableHead>
                      <TableHead>订单日期</TableHead>
                      <TableHead>交期</TableHead>
                      <TableHead>AI置信度</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedOrders.includes(order.id)}
                            onCheckedChange={() => handleSelectOrder(order.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell>{order.customerName}</TableCell>
                        <TableCell>
                          {new Date(order.orderDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {order.deliveryDate
                            ? new Date(order.deliveryDate).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {order.aiConfidence ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    order.aiConfidence >= 80
                                      ? "bg-green-600"
                                      : order.aiConfidence >= 60
                                        ? "bg-yellow-600"
                                        : "bg-red-600"
                                  }`}
                                  style={{ width: `${order.aiConfidence}%` }}
                                />
                              </div>
                              <span className="text-sm">
                                {order.aiConfidence}%
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              statusColors[
                                order.status as keyof typeof statusColors
                              ]
                            }
                          >
                            {
                              statusLabels[
                                order.status as keyof typeof statusLabels
                              ]
                            }
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/orders/${order.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            查看
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <p>暂无订单数据</p>
                <p className="text-sm mt-2">
                  订单将在邮件监听服务处理后自动显示
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
