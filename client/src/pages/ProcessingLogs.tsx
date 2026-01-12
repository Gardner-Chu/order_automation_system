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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { RefreshCw, Eye } from "lucide-react";

const statusColors = {
  pending: "bg-gray-100 text-gray-800 border-gray-300",
  processing: "bg-blue-100 text-blue-800 border-blue-300",
  success: "bg-green-100 text-green-800 border-green-300",
  failed: "bg-red-100 text-red-800 border-red-300",
  exception: "bg-yellow-100 text-yellow-800 border-yellow-300",
};

const statusLabels = {
  pending: "待处理",
  processing: "处理中",
  success: "成功",
  failed: "失败",
  exception: "异常",
};

const typeLabels = {
  excel: "Excel",
  image: "图片",
  pdf: "PDF",
  other: "其他",
};

export default function ProcessingLogs() {
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const { data: logs, isLoading, refetch } = trpc.processingLog.list.useQuery({
    limit: 100,
    offset: 0,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">处理日志</h1>
            <p className="text-muted-foreground mt-1">
              查看邮件处理历史和AI识别结果
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>处理记录</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : logs && logs.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>邮件主题</TableHead>
                      <TableHead>发件人</TableHead>
                      <TableHead>附件名称</TableHead>
                      <TableHead>附件类型</TableHead>
                      <TableHead>处理状态</TableHead>
                      <TableHead>处理时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium max-w-xs truncate">
                          {log.emailSubject || "-"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {log.emailFrom || "-"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {log.attachmentName || "-"}
                        </TableCell>
                        <TableCell>
                          {log.attachmentType
                            ? typeLabels[
                                log.attachmentType as keyof typeof typeLabels
                              ]
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              statusColors[
                                log.processingStatus as keyof typeof statusColors
                              ]
                            }
                          >
                            {
                              statusLabels[
                                log.processingStatus as keyof typeof statusLabels
                              ]
                            }
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            详情
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <p>暂无处理日志</p>
                <p className="text-sm mt-2">
                  日志将在邮件处理后自动记录
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 日志详情对话框 */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>处理日志详情</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    邮件ID
                  </span>
                  <p className="text-sm mt-1 font-mono">
                    {selectedLog.emailId}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    处理状态
                  </span>
                  <div className="mt-1">
                    <Badge
                      variant="outline"
                      className={
                        statusColors[
                          selectedLog.processingStatus as keyof typeof statusColors
                        ]
                      }
                    >
                      {
                        statusLabels[
                          selectedLog.processingStatus as keyof typeof statusLabels
                        ]
                      }
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    邮件主题
                  </span>
                  <p className="text-sm mt-1">
                    {selectedLog.emailSubject || "-"}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    发件人
                  </span>
                  <p className="text-sm mt-1">{selectedLog.emailFrom || "-"}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    附件名称
                  </span>
                  <p className="text-sm mt-1">
                    {selectedLog.attachmentName || "-"}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    附件类型
                  </span>
                  <p className="text-sm mt-1">
                    {selectedLog.attachmentType
                      ? typeLabels[
                          selectedLog.attachmentType as keyof typeof typeLabels
                        ]
                      : "-"}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    处理时间
                  </span>
                  <p className="text-sm mt-1">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {selectedLog.errorMessage && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    错误信息
                  </span>
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800 font-mono">
                      {selectedLog.errorMessage}
                    </p>
                  </div>
                </div>
              )}

              {selectedLog.aiResponse && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">
                    AI识别结果
                  </span>
                  <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(
                        JSON.parse(selectedLog.aiResponse),
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
