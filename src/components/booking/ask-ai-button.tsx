"use client";

type AskAiButtonProps = {
  placeName: string;
};

export default function AskAiButton({ placeName }: { placeName: string }) {
  return (
    <button
      onClick={() => {
        window.dispatchEvent(
          new CustomEvent("open-chat", {
            detail: { prompt: `Hỏi AI về ${placeName}` },
          })
        );
      }}
      className="inline-flex items-center justify-center rounded-full bg-pine-700 px-5 py-3 text-sm font-semibold text-cream transition hover:bg-pine-900 active:scale-95 cursor-pointer"
    >
      Hỏi AI
    </button>
  );
}
