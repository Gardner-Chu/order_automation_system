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
import { ArrowLeft, CheckCircle, XCircle, RefreshCw, MessageSquare, Clock, Send, Trash2 } from "lucide-react";
import AttachmentPreview from "@/components/AttachmentPreview";
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
  const [newComment, setNewComment] = useState("");

  const { data: orderData, isLoading, refetch } = trpc.orders.getById.useQuery(
    { id: orderId },
    { enabled: orderId > 0 }
  );

  const { data: comments = [], refetch: refetchComments } = trpc.orderComment.list.useQuery(
    { orderId },
    { enabled: orderId > 0 }
  );

  const { data: history = [] } = trpc.orderHistory.list.useQuery(
    { orderId },
    { enabled: orderId > 0 }
  );

  const createCommentMutation = trpc.orderComment.create.useMutation({
    onSuccess: () => {
      toast.success("批注已添加");
      setNewComment("");
      refetchComments();
    },
    onError: () => {
      toast.error("添加批注失败");
    },
  });

  const deleteCommentMutation = trpc.orderComment.delete.useMutation({
    onSuccess: () => {
      toast.success("批注已删除");
      refetchComments();
    },
    onError: () => {
      toast.error("删除批注失败");
    },
  });

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

  const handleReject = () => {
    updateStatusMutation.mutate({
      id: orderId,
      status: "rejected",
      notes: notes || "订单被拒绝",
    });
  };

  const handleAddComment = () => {
    if (!newComment.trim()) {
      toast.error("请输入批注内容");
      return;
    }
    createCommentMutation.mutate({
      orderId,
      comment: newComment,
    });
  };

  const handleDeleteComment = (commentId: number) => {
    if (confirm("确定要删除这条批注吗？")) {
      deleteCommentMutation.mutate({ commentId });
    }
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

        {/* 批注区域 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              订单批注
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 批注列表 */}
            <div className="space-y-3">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-4 bg-muted rounded-lg space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {comment.userName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm mt-2">{comment.comment}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  暂无批注
                </p>
              )}
            </div>

            {/* 添加批注 */}
            <div className="space-y-2">
              <Textarea
                placeholder="添加审核意见或批注..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <Button
                onClick={handleAddComment}
                disabled={createCommentMutation.isPending || !newComment.trim()}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                添加批注
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 邮件附件预览 */}
        <AttachmentPreview attachmentUrls={order.attachmentUrls} />

        {/* 修改历史 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              修改历史
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length > 0 ? (
              <div className="space-y-4">
                {history.map((record, index) => (
                  <div key={record.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      {index < history.length - 1 && (
                        <div className="w-0.5 h-full bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {record.userName}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {record.action === "created" && "创建"}
                          {record.action === "updated" && "修改"}
                          {record.action === "confirmed" && "确认"}
                          {record.action === "rejected" && "拒绝"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(record.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {record.fieldName && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {record.fieldName}:
                          {record.oldValue && (
                            <span className="line-through ml-1">
                              {record.oldValue}
                            </span>
                          )}
                          {record.newValue && (
                            <span className="ml-1 text-foreground font-medium">
                              {record.newValue}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                暂无修改历史
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
