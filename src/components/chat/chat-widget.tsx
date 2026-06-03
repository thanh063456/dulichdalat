"use client";

/* eslint-disable react-hooks/immutability */

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BookingModal } from "@/components/chat/booking-modal";

type ChatRole = "user" | "bot";

type ChatMessage = {
  role: ChatRole;
  text: string;
};

type ChatChoice = {
  label: string;
  payload: {
    action: "go_node" | "open_link" | "open_booking" | "export_itinerary";
    value: string;
    type?: string;
  };
};

type AiResponse = {
  message?: string;
  response?: string;
  choices?: ChatChoice[];
};

type ChatHistoryItem = {
  sender: "user" | "bot";
  message: string;
};

type ChatWidgetProps = {
  mode?: "floating" | "embedded";
  autoSend?: string | null;
};

const greeting =
  "Xin chào! Tôi là trợ lý du lịch Đà Lạt. Hãy cho tôi biết bạn đi mấy ngày, đi với ai và ngân sách bao nhiêu nhé.";

function getStoredUser() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem("dalat_user");
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as { id?: string } | null;
    if (!parsed?.id) {
      return null;
    }

    return { id: parsed.id };
  } catch {
    return null;
  }
}

function createSessionId() {
  if (typeof window === "undefined") {
    return { id: "server", userId: null as string | null };
  }

  const user = getStoredUser();
  if (user?.id) {
    const storageKey = `dalat_sid_${user.id}`;
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      return { id: stored, userId: user.id };
    }

    const generated = window.crypto.randomUUID();
    window.localStorage.setItem(storageKey, generated);
    return { id: generated, userId: user.id };
  }

  // Guest: always get a new session ID, do not persist to localStorage
  const generated = window.crypto.randomUUID();
  return { id: generated, userId: null };
}

function formatMessage(text: string) {
  const segments = text.split(/(\*\*[^*]+\*\*)/g);

  return segments.map((segment) => {
    if (segment.startsWith("**") && segment.endsWith("**")) {
      return segment.slice(2, -2);
    }

    return segment;
  });
}

function extractQuickChoices(mode: "floating" | "embedded"): ChatChoice[] {
  if (mode === "embedded") {
    return [];
  }

  return [
    { label: "Lịch trình 3 ngày 2 đêm", payload: { action: "go_node", value: "itinerary_3d2n" } },
    { label: "Quán cà phê view đẹp", payload: { action: "go_node", value: "cafe_views" } },
    { label: "Đặt phòng homestay", payload: { action: "go_node", value: "stay_booking" } },
  ];
}

export function ChatWidget({ mode = "floating", autoSend = null }: ChatWidgetProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(mode === "embedded");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [choices, setChoices] = useState<ChatChoice[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [session, setSession] = useState<{ id: string; userId: string | null }>(() => createSessionId());
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const isFirstMount = useRef(true);

  useEffect(() => {
    // Only reset for guest users when the route (pathname) changes
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (!session.userId) {
      const newSession = createSessionId();
      setSession(newSession);
      setMessages([]);
      setChoices([]);
      setHistoryLoaded(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const handleUserChange = () => {
      const newSession = createSessionId();
      setSession(newSession);
      setMessages([]);
      setChoices([]);
      setHistoryLoaded(false);
    };

    window.addEventListener("dalat-user-changed", handleUserChange);
    return () => {
      window.removeEventListener("dalat-user-changed", handleUserChange);
    };
  }, []);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingPlaceName, setBookingPlaceName] = useState("");
  const [bookingType, setBookingType] = useState<"room" | "table">("table");
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const lastAutoSendRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || messages.length === 0) {
      return;
    }

    viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: "smooth" });
  }, [isOpen, messages]);

  useEffect(() => {
    if (mode === "embedded" && historyLoaded && messages.length === 0) {
      void postInitialGreeting();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, session.id, historyLoaded, messages.length]);

  useEffect(() => {
    async function loadHistory() {
      if (!session.id || !session.userId) {
        setHistoryLoaded(true);
        return;
      }

      try {
        const response = await fetch(`/api/chat/history?sid=${encodeURIComponent(session.id)}`, { credentials: "include" });
        const data = (await response.json()) as { success?: boolean; history?: ChatHistoryItem[] };
        if (!response.ok || data.success === false || !Array.isArray(data.history) || data.history.length === 0) {
          setHistoryLoaded(true);
          return;
        }

        setMessages(
          data.history.map((item) => ({
            role: item.sender,
            text: item.message,
          })),
        );
        setChoices(quickChoices);
      } catch {
        // ignore and fall back to greeting
      } finally {
        setHistoryLoaded(true);
      }
    }

    void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, session.userId]);

  const quickChoices = extractQuickChoices(mode);

  async function postInitialGreeting() {
    if (!session.id) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          q: "",
          sid: session.id,
          payload: { action: "go_node", value: "intro" },
          loc: null,
        }),
      });

      const data = (await response.json()) as AiResponse;
      const message = data.message ?? data.response ?? greeting;
      setMessages([{ role: "bot", text: message }]);
      setChoices(data.choices ?? quickChoices);
      await saveHistoryMessage("bot", message);
    } catch {
      setMessages([{ role: "bot", text: greeting }]);
      setChoices(quickChoices);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (mode !== "floating" || !isOpen || !historyLoaded || messages.length > 0) {
      return;
    }

    void postInitialGreeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- postInitialGreeting intentionally excluded
    }, [historyLoaded, isOpen, messages.length, mode, quickChoices]);

  useEffect(() => {
    if (!autoSend || autoSend === lastAutoSendRef.current) {
      return;
    }

    lastAutoSendRef.current = autoSend;
    if (session.id) {
      void sendMessage(autoSend);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSend, session.id]);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ prompt: string }>;
      setIsOpen(true);
      setUnread(0);
      if (customEvent.detail?.prompt && session.id) {
        void sendMessage(customEvent.detail.prompt);
      }
    };

    window.addEventListener("open-chat", handler as EventListener);
    return () => {
      window.removeEventListener("open-chat", handler as EventListener);
    };
  }, [session.id]);

  async function sendMessage(text: string) {
    if (!text.trim() || !session.id) {
      return;
    }

    const userMessage: ChatMessage = { role: "user", text: text.trim() };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsLoading(true);
    await saveHistoryMessage("user", text.trim());

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ q: text.trim(), sid: session.id }),
      });

      const data = (await response.json()) as AiResponse;
      const message = data.message ?? data.response ?? "Hiện tại tôi chưa kết nối được AI, nhưng bạn vẫn có thể dùng các gợi ý nhanh để khám phá Đà Lạt.";
      setMessages((current) => [...current, { role: "bot", text: message }]);
      setChoices(data.choices ?? quickChoices);
      await saveHistoryMessage("bot", message);
      if (mode === "floating" && !isOpen) {
        setUnread((current) => current + 1);
      }
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "bot",
          text: "Hiện tại tôi chưa kết nối được AI, nhưng bạn vẫn có thể dùng các gợi ý nhanh để khám phá Đà Lạt.",
        },
      ]);
      setChoices(quickChoices);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveHistoryMessage(sender: "user" | "bot", message: string) {
    if (!session.userId) {
      return;
    }
    try {
      await fetch("/api/chat/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sid: session.id, sender, message, userId: session.userId }),
      });
    } catch {
      // ignore storage failures
    }
  }

  async function resetConversation() {
    setMessages([]);
    setChoices([]);

    try {
      if (session.id && session.userId) {
        await fetch(`/api/chat/history?sid=${encodeURIComponent(session.id)}`, { method: "DELETE", credentials: "include" });
      }
    } catch {
      // ignore delete failures
    }

    if (isOpen || mode === "embedded") {
      await postInitialGreeting();
    }
  }

  function handleChoice(choice: ChatChoice) {
    if (choice.payload.action === "open_link") {
      window.open(choice.payload.value, "_blank", "noopener,noreferrer");
      return;
    }

    if (choice.payload.action === "open_booking") {
      setBookingPlaceName(choice.payload.value);
      setBookingType(choice.payload.type === "room" ? "room" : "table");
      setBookingOpen(true);
      return;
    }

    if (choice.payload.action === "export_itinerary") {
      void sendMessage("xuất lịch trình");
      return;
    }

    void sendMessage(choice.payload.value || choice.label);
  }

  const panel = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-cream shadow-[0_24px_80px_rgba(26,47,15,0.18)]">
      <div className="flex items-center justify-between bg-pine-900 px-5 py-4 text-cream">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cream/70">Trợ Lý Du Lịch Đà Lạt</p>
          <p className="text-xs text-cream/70">● Đang trực tuyến · Powered by Gemini AI</p>
        </div>
        {mode === "floating" ? (
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-full border border-cream/20 px-3 py-1 text-sm"
          >
            Đóng
          </button>
        ) : null}
      </div>

      <div ref={viewportRef} className="chat-scrollbar min-h-0 flex-1 space-y-4 overflow-y-scroll bg-stone-50 p-4">
        {messages.length === 0 ? (
          <div className="rounded-3xl border border-pine-500/10 bg-white p-4 text-sm text-smoke">
            {greeting}
          </div>
        ) : null}

        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={message.role === "user" ? "ml-auto max-w-[82%]" : "mr-auto max-w-[82%]"}
          >
            <div
              className={
                message.role === "user"
                  ? "rounded-3xl rounded-tr-none bg-pine-700 px-4 py-3 text-sm leading-7 text-cream"
                  : "rounded-3xl rounded-tl-none border border-pine-500/10 bg-white px-4 py-3 text-sm leading-7 text-charcoal"
              }
            >
              {formatMessage(message.text).map((part, partIndex) => (
                <span key={`${index}-${partIndex}`}>
                  {part}
                </span>
              ))}
            </div>
          </div>
        ))}

        {isLoading ? (
          <div className="flex items-center gap-2 rounded-3xl rounded-tl-none border border-pine-500/10 bg-white px-4 py-3 text-sm text-smoke">
            <span className="h-2 w-2 rounded-full bg-pine-500 animate-pulse" />
            <span className="h-2 w-2 rounded-full bg-pine-500 animate-pulse [animation-delay:0.15s]" />
            <span className="h-2 w-2 rounded-full bg-pine-500 animate-pulse [animation-delay:0.3s]" />
          </div>
        ) : null}
      </div>

      <div className="border-t border-pine-500/10 bg-cream p-4">
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => void resetConversation()}
            className="rounded-full border border-pine-500/20 px-3 py-1 text-xs font-semibold text-pine-700 transition hover:bg-pine-500/5"
          >
            Reset hội thoại
          </button>
        </div>

        {choices.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {choices.map((choice) => (
              <button
                type="button"
                key={choice.label}
                onClick={() => handleChoice(choice)}
                className="rounded-full border border-pine-500/20 px-3 py-2 text-xs font-semibold text-pine-700 transition hover:bg-pine-500/5"
              >
                {choice.label}
              </button>
            ))}
          </div>
        ) : null}

        <form
          className="flex items-center gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage(input);
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Nhập câu hỏi của bạn..."
            className="h-12 flex-1 rounded-full border-2 border-pine-500/10 bg-white px-5 text-sm outline-none transition focus:border-pine-500"
          />
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-full bg-pine-700 px-5 text-sm font-semibold text-cream transition hover:bg-pine-900"
          >
            Gửi
          </button>
        </form>
      </div>
    </div>
  );

  if (mode === "embedded") {
    return <div className="h-full w-full">{panel}</div>;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Mở trợ lý Đà Lạt"
        onClick={() => {
          setIsOpen(true);
          setUnread(0);
        }}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#2D5016] text-2xl text-cream shadow-2xl shadow-pine-900/30 transition-all duration-300 hover:scale-110 hover:bg-[#234111] active:scale-95"
      >
        🌿
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white animate-pulse">
            {unread}
          </span>
        ) : null}
      </button>

      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ease-out ${isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden={!isOpen}
      >
        <button
          type="button"
          aria-label="Đóng trợ lý"
          className="absolute inset-0 cursor-default bg-black/20 backdrop-blur-[1px]"
          onClick={() => setIsOpen(false)}
          tabIndex={isOpen ? 0 : -1}
        />

        <aside
          className={`absolute right-0 top-0 flex h-dvh w-[24rem] max-w-[calc(100vw-1.5rem)] transform border-l border-pine-500/10 ${isOpen ? "drawer-enter" : "drawer-exit"}`}
          style={{
            willChange: isOpen ? "transform" : "auto",
          }}
        >
          {panel}
        </aside>
      </div>

      <BookingModal
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        placeName={bookingPlaceName}
        bookingType={bookingType}
        onBooked={(message) => {
          void saveHistoryMessage("bot", message);
          setMessages((current) => [...current, { role: "bot", text: message }]);
          setChoices(quickChoices);
        }}
      />
    </>
  );
}