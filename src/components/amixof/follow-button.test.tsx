import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Profile } from "@/lib/social/types";

const toggle = vi.fn();
vi.mock("@/lib/social/hooks", () => ({ useFollow: () => toggle }));
import { FollowButton } from "@/components/amixof/follow-button";

const p = (following: boolean): Profile => ({ id: "1", handle: "k", name: "Kaydence", avatar: "", banner: "", bio: "", category: "", verified: false, isDemo: true, followers: 1, following });

describe("FollowButton", () => {
  it("offers Follow, with an accessible name that says who", async () => {
    render(<FollowButton profile={p(false)} />);
    const b = screen.getByRole("button", { name: "Follow Kaydence" });
    await userEvent.click(b);
    expect(toggle).toHaveBeenCalledTimes(1);
  });
  it("shows Following and offers to unfollow", () => {
    render(<FollowButton profile={p(true)} />);
    expect(screen.getByRole("button", { name: "Following Kaydence" })).toBeInTheDocument();
    expect(screen.getByText("Following")).toBeInTheDocument();
  });
});
