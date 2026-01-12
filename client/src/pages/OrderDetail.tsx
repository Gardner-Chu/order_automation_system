import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { useState } from "react";

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

export default function OrderDetail() {
  const [, params] = useRoute("/orders/:id");
  const [, setLocation] = useLocation();
  const orderId = params?.id ? parseInt(params.id) : 0;
  const [notes, setNotes] = useState("");

  const { data: orderData, isLoading, refetch } = trpc.orders.getById.useQuery(
    { id: orderId },
    { enabled: orderId > 0 }
  );

  const updateStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("订单状态已更新");
      refetch();
    },
    onError: () => {
      toast.error("更新失败");
    },
  });

  const handleConfirm = async () => {
    await updateStatusMutation.mutateAsync({
      id: orderId,
      status: "confirmed",
      notes: notes || undefined,
    });
  };

  const handleReject = async () => {
    await updateStatusMutation.mutateAsync({
      id: orderId,
      status: "exception",
      notes: notes || "订单被拒绝",
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

  if (!orderData) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground">订单不存在</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setLocation("/orders")}
          >
            返回订单列表
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const { order, items } = orderData;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/orders")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">订单详情</h1>
            <p className="text-muted-foreground mt-1">
              订单号: {order.orderNumber}
            </p>
          </div>
          <Badge
            variant="outline"
            className={`text-base px-4 py-1 ${statusColors[order.status as keyof typeof statusColors]}`}
          >
            {statusLabels[order.status as keyof typeof statusLabels]}
          </Badge>
        </div>

        {/* 订单基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    客户名称
                  </span>
                  <p className="text-base mt-1">{order.customerName}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    客户邮箱
                  </span>
                  <p className="text-base mt-1">
                    {order.customerEmail || "-"}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    订单日期
                  </span>
                  <p className="text-base mt-1">
                    {new Date(order.orderDate).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    交期
                  </span>
                  <p className="text-base mt-1">
                    {order.deliveryDate
                      ? new Date(order.deliveryDate).toLocaleDateString()
                      : "-"}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    AI识别置信度
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          (order.aiConfidence || 0) >= 80
                            ? "bg-green-600"
                            : (order.aiConfidence || 0) >= 60
                              ? "bg-yellow-600"
                              : "bg-red-600"
                        }`}
                        style={{ width: `${order.aiConfidence || 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {order.aiConfidence || 0}%
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    来源邮件ID
                  </span>
                  <p className="text-base mt-1 font-mono text-sm">
                    {order.sourceEmailId || "-"}
                  </p>
                </div>
              </div>
            </div>
            {order.notes && (
              <div className="mt-6">
                <span className="text-sm font-medium text-muted-foreground">
                  备注
                </span>
                <p className="text-base mt-1 text-yellow-700">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 订单项目 */}
        <Card>
          <CardHeader>
            <CardTitle>订单项目</CardTitle>
          </CardHeader>
          <CardContent>
            {items && items.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>产品编码</TableHead>
                      <TableHead>数量</TableHead>
                      <TableHead>规格</TableHead>
                      <TableHead>单价</TableHead>
                      <TableHead>总价</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.productCode}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.specification || "-"}</TableCell>
                        <TableCell>
                          {item.unitPrice
                            ? `¥${(item.unitPrice / 100).toFixed(2)}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {item.totalPrice
                            ? `¥${(item.totalPrice / 100).toFixed(2)}`
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                暂无订单项目
              </p>
            )}
          </CardContent>
        </Card>

        {/* 操作区域 */}
        {(order.status === "pending" || order.status === "exception") && (
          <Card>
            <CardHeader>
              <CardTitle>订单审核</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">备注</label>
                <Textarea
                  placeholder="添加备注信息（可选）"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleConfirm}
                  disabled={updateStatusMutation.isPending}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  确认订单
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={updateStatusMutation.isPending}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  拒绝订单
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
