"use client";

import { PanelLeftIcon, Share2, GitFork, Loader2 } from "lucide-react";
import { memo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { cloneChat } from "@/app/(chat)/actions";
import { VisibilitySelector, type VisibilityType } from "./visibility-selector";

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const { state, toggleSidebar, isMobile } = useSidebar();
  const router = useRouter();
  const [isCloning, setIsCloning] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/chat/${chatId}`;
    navigator.clipboard.writeText(url);
    toast.success("Lien public copié !");
  };

  const handleClone = async () => {
    setIsCloning(true);
    try {
      const newChatId = await cloneChat({ chatId });
      router.push(`/chat/${newChatId}`);
      toast.success("Discussion clonée avec succès !");
    } catch (err: any) {
      if (err instanceof Error && err.message === "Unauthorized") {
        toast.error("Veuillez vous connecter pour cloner cette discussion.");
      } else {
        toast.error("Erreur lors du clonage de la discussion.");
      }
    } finally {
      setIsCloning(false);
    }
  };

  if (state === "collapsed" && !isMobile) {
    return null;
  }

  return (
    <header className="sticky top-0 flex h-14 items-center justify-between gap-2 bg-sidebar px-3">
      <div className="flex items-center gap-2">
        <Button
          className="md:hidden"
          onClick={toggleSidebar}
          size="icon-sm"
          variant="ghost"
        >
          <PanelLeftIcon className="size-4" />
        </Button>

        {!isReadonly && (
          <div className="flex items-center gap-2">
            <VisibilitySelector
              chatId={chatId}
              selectedVisibilityType={selectedVisibilityType}
            />
            {selectedVisibilityType === "public" && (
              <Button
                onClick={handleCopyLink}
                size="sm"
                variant="outline"
                className="gap-1.5 rounded-lg border-border/50 text-muted-foreground shadow-none hover:text-foreground active:translate-y-0"
              >
                <Share2 className="size-4" />
                <span>Copier le lien</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {isReadonly && (
        <Button
          onClick={handleClone}
          disabled={isCloning}
          className="gap-2 rounded-lg"
          size="sm"
        >
          {isCloning ? <Loader2 className="size-4 animate-spin" /> : <GitFork className="size-4" />}
          Cloner la discussion
        </Button>
      )}
    </header>
  );
}

export const ChatHeader = memo(
  PureChatHeader,
  (prevProps, nextProps) =>
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly
);
