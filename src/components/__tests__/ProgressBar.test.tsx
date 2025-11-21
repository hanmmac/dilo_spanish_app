import { render, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import confetti from "canvas-confetti";
import { ProgressBar } from "../ProgressBar";

vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

const confettiMock = vi.mocked(confetti);

describe("ProgressBar confetti triggers", () => {
  it("fires confetti when progress reaches the total for the first time", async () => {
    const { rerender } = render(<ProgressBar completed={8} total={10} />);
    expect(confettiMock).not.toHaveBeenCalled();

    rerender(<ProgressBar completed={10} total={10} />);

    await waitFor(() => {
      expect(confettiMock).toHaveBeenCalledTimes(1);
    });
  });

  it("does not fire confetti again if progress stays complete", async () => {
    const { rerender } = render(<ProgressBar completed={10} total={10} />);

    await waitFor(() => {
      expect(confettiMock).toHaveBeenCalledTimes(1);
    });

    rerender(<ProgressBar completed={10} total={10} />);

    await waitFor(() => {
      expect(confettiMock).toHaveBeenCalledTimes(1);
    });
  });
});

