import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Inbox } from "lucide-react";
import { EmptyState, ErrorState, LoadingState, SkeletonRows } from "@/components/amixof/states";

describe("EmptyState", () => {
  it("shows the title, description and action, and is not an alert", () => {
    render(<EmptyState icon={Inbox} title="Nothing here" description="Add something" action={<button>Add</button>} />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("Add something")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("works with only a title", () => {
    render(<EmptyState title="Empty" />);
    expect(screen.getByText("Empty")).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("is announced as an alert", () => {
    render(<ErrorState title="Couldn't load" description="Try later" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load");
  });
  it("offers a retry only when there is something to retry", async () => {
    const retry = vi.fn();
    const { rerender } = render(<ErrorState />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    rerender(<ErrorState onRetry={retry} />);
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
  it("disables retry and says so while retrying", () => {
    render(<ErrorState onRetry={() => {}} retrying />);
    expect(screen.getByRole("button", { name: /retrying/i })).toBeDisabled();
  });
  it("has a sensible default title", () => {
    render(<ErrorState />);
    expect(screen.getByRole("alert")).toHaveTextContent(/something went wrong/i);
  });
});

describe("loading states", () => {
  it("LoadingState is a polite status with a label", () => {
    render(<LoadingState label="Checking your session…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Checking your session…");
  });
  it("SkeletonRows is busy, labelled for screen readers, and renders the requested rows", () => {
    const { container } = render(<SkeletonRows rows={3} label="Loading posts…" />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent("Loading posts…");
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3);
  });
});
