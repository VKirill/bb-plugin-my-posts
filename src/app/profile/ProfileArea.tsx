import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "../i18n";
import type { Route } from "../routes";

export function ProfileArea({ route }: { route: Route }) {
  const isCreate = route.kind === "create-profile";
  return (
    <Card className="mp-card">
      <CardHeader className="p-0">
        <CardTitle>{t(isCreate ? "createProfileTitle" : "profileEmptyTitle")}</CardTitle>
        <CardDescription>{t(isCreate ? "createProfileHint" : "profileEmptyHint")}</CardDescription>
      </CardHeader>
    </Card>
  );
}
