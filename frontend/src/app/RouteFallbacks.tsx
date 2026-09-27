import { CircleAlert, FileQuestion, LoaderCircle } from "lucide-react";
import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router";

import { StatePanel } from "@/components/common/StatePanel";
import { BrandHeader } from "@/components/layout/BrandHeader";
import { Button } from "@/components/ui/button";

export function RouteLoadingFallback() {
  return (
    <main
      className="bg-background flex h-dvh flex-col"
      aria-busy="true"
      aria-label="画面を読み込み中"
    >
      <BrandHeader />
      <StatePanel className="flex-1" icon={LoaderCircle} isLoading={true} />
    </main>
  );
}

export function RouteErrorFallback() {
  const navigate = useNavigate();

  const error = useRouteError();
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;
  const Icon = isNotFound ? FileQuestion : CircleAlert;

  return (
    <main className="bg-background flex h-dvh flex-col">
      <BrandHeader />
      <StatePanel
        className="flex-1 px-6"
        icon={Icon}
        message={
          isNotFound
            ? "ページが見つかりません。URLを確認してください。"
            : "画面を表示できませんでした。時間をおいてから、もう一度お試しください。"
        }
        action={
          <Button variant="outline" size="sm" onClick={() => void navigate("/notes")}>
            ノート一覧へ戻る
          </Button>
        }
        role="alert"
      />
    </main>
  );
}
