import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Image as ImageIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AttachmentPreviewProps {
  attachmentUrls?: string | null;
}

export default function AttachmentPreview({ attachmentUrls }: AttachmentPreviewProps) {
  if (!attachmentUrls) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            邮件附件
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">暂无附件</p>
        </CardContent>
      </Card>
    );
  }

  let attachments: string[] = [];
  try {
    attachments = JSON.parse(attachmentUrls);
  } catch (e) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            邮件附件
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">附件格式错误</p>
        </CardContent>
      </Card>
    );
  }

  const isImage = (url: string) => {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"];
    return imageExtensions.some((ext) => url.toLowerCase().endsWith(ext));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          邮件附件 ({attachments.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {attachments.map((url, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-2">
              {isImage(url) ? (
                <>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ImageIcon className="h-4 w-4" />
                    图片附件 {index + 1}
                  </div>
                  <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                    <img
                      src={url}
                      alt={`附件 ${index + 1}`}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3E加载失败%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4" />
                    Excel附件 {index + 1}
                  </div>
                  <div className="flex items-center justify-center aspect-video bg-muted rounded-md">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                  </div>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(url, "_blank")}
              >
                <Download className="h-4 w-4 mr-2" />
                下载附件
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
