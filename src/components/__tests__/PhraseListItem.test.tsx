import type { ReactNode } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi } from "vitest";
import { PhraseListItem } from "../PhraseListItem";

vi.mock("@/components/VerbConjugation", () => ({
  VerbConjugation: ({ children }: { children: ReactNode }) => (
    <span data-testid="verb">{children}</span>
  ),
}));

const baseProps = {
  id: 1,
  spanish: "¿Cómo estás?",
  english: "How are you?",
  difficulty: "Easy" as const,
  used: false,
  formalWords: { estás: "está" },
  alternatives: [],
  onToggleUsed: vi.fn(),
  onOpenAlternatives: vi.fn(),
};

describe("PhraseListItem speech support", () => {
  const originalSpeechSynthesis = window.speechSynthesis;
  const originalUtterance = globalThis.SpeechSynthesisUtterance;
  let speakMock: ReturnType<typeof vi.fn>;
  let cancelMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    speakMock = vi.fn();
    cancelMock = vi.fn();
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        speak: speakMock,
        cancel: cancelMock,
      },
      configurable: true,
    });

    // Minimal SpeechSynthesisUtterance stub.
    // @ts-expect-error - jsdom doesn't implement this API
    globalThis.SpeechSynthesisUtterance = function (this: any, text: string) {
      this.text = text;
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalSpeechSynthesis) {
      Object.defineProperty(window, "speechSynthesis", {
        value: originalSpeechSynthesis,
        configurable: true,
      });
    } else {
      delete (window as typeof window & {
        speechSynthesis?: SpeechSynthesis;
      }).speechSynthesis;
    }

    if (originalUtterance) {
      globalThis.SpeechSynthesisUtterance = originalUtterance;
    } else {
      // @ts-expect-error - cleanup stub
      delete globalThis.SpeechSynthesisUtterance;
    }
  });

  it("triggers speech synthesis when the listen button is clicked", () => {
    render(<PhraseListItem {...baseProps} />);

    const listenButton = screen.getByTitle("Listen to pronunciation");
    act(() => {
      fireEvent.click(listenButton);
    });

    expect(speakMock).toHaveBeenCalledTimes(1);
    const utterance = speakMock.mock.calls[0]?.[0] as SpeechSynthesisUtterance & {
      text: string;
      onstart?: () => void;
    };
    expect(utterance.text).toBe(baseProps.spanish);

    // Simulate the browser starting playback so the UI enters "stop" mode.
    act(() => {
      utterance.onstart?.();
    });
    expect(
      screen.getByTitle("Stop pronunciation")
    ).toBeInTheDocument();

    const cancelCallsAfterStart = cancelMock.mock.calls.length;

    // Clicking again should cancel playback.
    act(() => {
      fireEvent.click(screen.getByTitle("Stop pronunciation"));
    });
    expect(cancelMock.mock.calls.length).toBe(cancelCallsAfterStart + 1);
  });

  it("hides the listen button when speech synthesis is unavailable", () => {
    delete (window as typeof window & { speechSynthesis?: SpeechSynthesis })
      .speechSynthesis;

    render(<PhraseListItem {...baseProps} />);

    expect(
      screen.queryByTitle(/pronunciation/i)
    ).not.toBeInTheDocument();
  });
});

