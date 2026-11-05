import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "../i18n";

export function PostPage({ postId }: { postId: string }) {
  return (
    <Card className="mp-card">
      <CardHeader className="p-0">
        <CardTitle>{t("postStubTitle")}</CardTitle>
        <CardDescription>{t("postStubHint")}</CardDescription>
        <p className="text-sm text-muted-foreground">{postId}</p>
      </CardHeader>
    </Card>
  );
}
