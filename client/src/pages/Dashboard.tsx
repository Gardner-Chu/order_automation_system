import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  Package,
  Clock,
  AlertCircle,
  CheckCircle,
  Activity,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const { data: stats, isLoading, refetch } = trpc.dashboard.stats.useQuery();
  const { data: emailStatus } = trpc.email.status.useQuery();
  const startEmailMutation = trpc.email.start.useMutation();
  const stopEmailMutation = trpc.email.stop.useMutation();
  const syncMutation = trpc.email.sync.useMutation();
  const seedMutation = trpc.seed.all.useMutation();

  const handleStartEmail = async () => {
    try {
      await startEmailMutation.mutateAsync({ intervalSeconds: 30 });
      toast.success("邮件监听服务已启动");
      refetch();
    } catch (error) {
      toast.error("启动失败");
    }
  };

  const handleStopEmail = async () => {
    try {
      await stopEmailMutation.mutateAsync();
      toast.success("邮件监听服务已停止");
      refetch();
    } catch (error) {
      toast.error("停止失败");
    }
  };

  const handleSync = async () => {
    try {
      const result = await syncMutation.mutateAsync();
      toast.success(result.message);
      refetch();
    } catch (error) {
      toast.error("同步失败");
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">仪表板</h1>
            <p className="text-muted-foreground mt-1">
              实时监控订单处理状态和系统运行情况
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await seedMutation.mutateAsync();
                  toast.success("模拟数据已生成");
                  refetch();
                } catch (error) {
                  toast.error("生成失败");
                }
              }}
              disabled={seedMutation.isPending}
            >
              {seedMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              生成模拟数据
            </Button>
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              手动同步
            </Button>
            {emailStatus?.isRunning ? (
              <Button
                variant="destructive"
                onClick={handleStopEmail}
                disabled={stopEmailMutation.isPending}
              >
                停止监听
              </Button>
            ) : (
              <Button
                onClick={handleStartEmail}
                disabled={startEmailMutation.isPending}
              >
                启动监听
              </Button>
            )}
          </div>
        </div>

        {/* 邮件监听状态 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              邮件监听服务状态
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">运行状态</span>
                <span className="text-lg font-semibold mt-1">
                  {emailStatus?.isRunning ? (
                    <span className="text-green-600 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-600 animate-pulse" />
                      运行中
                    </span>
                  ) : (
                    <span className="text-gray-500 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-gray-400" />
                      已停止
                    </span>
                  )}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">
                  最后同步时间
                </span>
                <span className="text-lg font-semibold mt-1">
                  {emailStatus?.lastSyncTime
                    ? new Date(emailStatus.lastSyncTime).toLocaleString()
                    : "未同步"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">已处理</span>
                <span className="text-lg font-semibold mt-1">
                  {emailStatus?.processedCount || 0}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">错误数</span>
                <span className="text-lg font-semibold mt-1 text-red-600">
                  {emailStatus?.errorCount || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总订单数</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                所有订单总数
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">待处理订单</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats?.pendingOrders || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                等待确认的订单
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">异常订单</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats?.exceptionOrders || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                需要人工审核
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已完成订单</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats?.completedOrders || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                成功处理的订单
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 处理统计 */}
        <Card>
          <CardHeader>
            <CardTitle>处理统计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">
                  总处理数
                </span>
                <span className="text-3xl font-bold mt-2">
                  {stats?.totalProcessed || 0}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">
                  成功处理
                </span>
                <span className="text-3xl font-bold mt-2 text-green-600">
                  {stats?.successfulProcessed || 0}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">
                  处理失败
                </span>
                <span className="text-3xl font-bold mt-2 text-red-600">
                  {stats?.failedProcessed || 0}
                </span>
              </div>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">成功率</span>
                <span className="text-sm font-medium">
                  {stats?.successRate || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${stats?.successRate || 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
