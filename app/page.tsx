"use client";
import Assistant from "@/components/assistant";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useConversationStore from "@/stores/useConversationStore";

export default function Main() {
  const router = useRouter();
  const { resetConversation } = useConversationStore();

  // After OAuth redirect, reinitialize the conversation so the next turn
  // uses the connector-enabled server configuration immediately
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isConnected = new URLSearchParams(window.location.search).get("connected");
    if (isConnected === "1") {
      resetConversation();
      router.replace("/", { scroll: false });
    }
  }, [router, resetConversation]);

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <Assistant />
      </div>
    </div>
  );
}
