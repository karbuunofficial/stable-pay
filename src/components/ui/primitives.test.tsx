import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TabBar } from "@/components/ui/tab-bar";
import { ProfileAvatar } from "@/components/amixof/profile-avatar";

describe("Button", () => {
  const variants = ["default", "secondary", "outline", "ghost", "subtle", "destructive", "link"] as const;
  const sizes = ["xs", "sm", "default", "lg", "xl", "icon-sm", "icon", "icon-lg"] as const;

  it("defaults to the primary action at the default control height", () => {
    render(<Button>Save</Button>);
    const b = screen.getByRole("button", { name: "Save" });
    expect(b).toHaveClass("bg-primary", "text-primary-foreground", "h-control-md", "rounded-control");
  });

  it.each(variants)("variant %s has a visible disabled style (never just faded)", (variant) => {
    const cls = buttonVariants({ variant });
    expect(cls).toMatch(/disabled:/);
  });

  it("uses only the control scale for height and size (no ad-hoc h-9)", () => {
    for (const size of sizes) {
      const cls = buttonVariants({ size, variant: "default" });
      expect(cls, size).toMatch(/(h|size)-control-(xs|sm|md|lg|xl)/);
      expect(cls, size).not.toMatch(/\bh-(7|8|9|10|11|12)\b/);
    }
  });

  it("is flat: no variant carries a shadow (depth is for floating layers)", () => {
    for (const variant of variants) for (const size of sizes) expect(buttonVariants({ variant, size })).not.toMatch(/shadow/);
  });

  it("supports the pill shape", () => {
    render(<Button shape="pill">Follow</Button>);
    expect(screen.getByRole("button")).toHaveClass("rounded-full");
  });

  it("loading disables the button, marks it busy, shows a spinner and keeps the label", async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Saving</Button>);
    const b = screen.getByRole("button", { name: "Saving" });
    expect(b).toBeDisabled();
    expect(b).toHaveAttribute("aria-busy", "true");
    expect(b.querySelector("svg")).toHaveClass("animate-spin");
    await userEvent.click(b);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is not busy when not loading", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-busy");
  });

  it("asChild styles a link as a button without changing the element", () => {
    render(<Button asChild variant="outline"><a href="/pay">Pay</a></Button>);
    const link = screen.getByRole("link", { name: "Pay" });
    expect(link).toHaveAttribute("href", "/pay");
    expect(link).toHaveClass("border", "h-control-md");
  });

  it("forwards refs and merges a caller's class last", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref} className="w-full">Wide</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current).toHaveClass("w-full", "bg-primary");
  });
});

describe("Input", () => {
  it("sits on the raised surface with the control border and height", () => {
    render(<Input aria-label="Name" />);
    expect(screen.getByLabelText("Name")).toHaveClass("bg-surface-2", "border-input", "h-control-md", "rounded-control");
  });
  it("has size variants from the control scale and no shadow", () => {
    render(<><Input aria-label="s" size="sm" /><Input aria-label="x" size="xl" /></>);
    expect(screen.getByLabelText("s")).toHaveClass("h-control-sm");
    expect(screen.getByLabelText("x")).toHaveClass("h-control-xl");
    expect(screen.getByLabelText("x").className).not.toMatch(/shadow/);
  });
  it("shows the invalid state through aria-invalid (one signal for styling and assistive tech)", () => {
    render(<Input aria-label="Name" aria-invalid />);
    const input = screen.getByLabelText("Name");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.className).toMatch(/aria-\[invalid=true\]:border-destructive/);
  });
  it("forwards refs", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} aria-label="x" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});

describe("Badge", () => {
  it.each([
    ["success", "bg-success-subtle", "text-success-text"],
    ["warning", "bg-warning-subtle", "text-warning-text"],
    ["info", "bg-info-subtle", "text-info-text"],
    ["destructive", "bg-destructive-subtle", "text-destructive-text"],
    ["brand", "bg-brand-subtle", "text-brand"],
    ["live", "bg-live", "text-live-foreground"],
  ] as const)("%s uses its own tokens", (variant, bg, text) => {
    render(<Badge variant={variant}>x</Badge>);
    expect(screen.getByText("x")).toHaveClass(bg, text);
  });
  it("is a small pill by default", () => {
    render(<Badge>x</Badge>);
    expect(screen.getByText("x")).toHaveClass("rounded-full", "h-5", "bg-surface-2");
  });
});

describe("Alert", () => {
  it("announces errors assertively and everything else politely", () => {
    const { rerender } = render(<Alert variant="destructive"><AlertTitle>t</AlertTitle><AlertDescription>d</AlertDescription></Alert>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    for (const v of ["default", "info", "success", "warning"] as const) {
      rerender(<Alert variant={v}>x</Alert>);
      expect(screen.getByRole("status"), v).toBeInTheDocument();
      expect(screen.queryByRole("alert"), v).not.toBeInTheDocument();
    }
  });
  it("lets the caller override the role", () => {
    render(<Alert role="note">x</Alert>);
    expect(screen.getByRole("note")).toBeInTheDocument();
  });
  it("tints with its status tokens", () => {
    render(<Alert variant="warning">x</Alert>);
    expect(screen.getByRole("status")).toHaveClass("bg-warning-subtle");
  });
});

describe("Card", () => {
  it("is flat: border and tone, no shadow", () => {
    render(<Card data-testid="c" />);
    const c = screen.getByTestId("c");
    expect(c).toHaveClass("rounded-card", "border", "bg-card");
    expect(c.className).not.toMatch(/shadow/);
  });
  it("only gets the hover tone when interactive", () => {
    render(<><Card data-testid="flat" /><Card data-testid="link" interactive /></>);
    expect(screen.getByTestId("flat").className).not.toMatch(/hover:/);
    expect(screen.getByTestId("link")).toHaveClass("hover:bg-surface-hover", "cursor-pointer");
  });
});

describe("Skeleton", () => {
  it("is a neutral block, not brand-tinted", () => {
    render(<Skeleton data-testid="s" />);
    const s = screen.getByTestId("s");
    expect(s).toHaveClass("bg-surface-2", "animate-pulse");
    expect(s.className).not.toMatch(/primary/);
  });
});

describe("Avatar sizes", () => {
  it.each([["xs", "size-avatar-xs"], ["sm", "size-avatar-sm"], ["md", "size-avatar-md"], ["lg", "size-avatar-lg"], ["xl", "size-avatar-xl"]] as const)("%s -> %s", (size, cls) => {
    const { container } = render(<Avatar size={size} />);
    expect(container.firstChild).toHaveClass(cls, "rounded-full");
  });
  it("defaults to md (40px)", () => {
    const { container } = render(<Avatar />);
    expect(container.firstChild).toHaveClass("size-avatar-md");
  });
  it("ProfileAvatar falls back to a bold initial that scales with the size", () => {
    render(<ProfileAvatar name="  kaydence" size="xl" />);
    const initial = screen.getByText("K");
    expect(initial).toHaveClass("bg-primary", "text-3xl");
  });
  it("ProfileAvatar copes with an empty name", () => {
    render(<ProfileAvatar name="" />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });
});

describe("TabBar", () => {
  const tabs = [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }, { value: "c", label: "Gamma" }] as const;

  it("renders a labelled tablist with the selected tab marked", () => {
    render(<TabBar label="Sections" tabs={tabs} value="b" onChange={() => {}} />);
    expect(screen.getByRole("tablist", { name: "Sections" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute("aria-selected", "false");
  });

  it("reports the clicked tab", async () => {
    const onChange = vi.fn();
    render(<TabBar tabs={tabs} value="a" onChange={onChange} />);
    await userEvent.click(screen.getByRole("tab", { name: "Gamma" }));
    expect(onChange).toHaveBeenCalledWith("c");
  });

  it("shows the active tab with an indicator bar and heavier weight (not colour alone)", () => {
    render(<TabBar tabs={tabs} value="a" onChange={() => {}} />);
    const active = screen.getByRole("tab", { name: "Alpha" });
    expect(active).toHaveClass("font-semibold");
    expect(active.querySelector("span")).toHaveClass("opacity-100");
    expect(screen.getByRole("tab", { name: "Beta" }).querySelector("span")).toHaveClass("opacity-0");
  });

  it("spreads tabs evenly and can stick under the top bar", () => {
    const { container } = render(<TabBar tabs={tabs} value="a" onChange={() => {}} sticky />);
    const list = container.firstChild as HTMLElement;
    expect(list.style.gridTemplateColumns).toBe("repeat(3, minmax(0, 1fr))");
    expect(list).toHaveClass("sticky");
  });

  it("has a compact pill variant for filters", () => {
    render(<TabBar variant="pill" tabs={tabs} value="a" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveClass("rounded-full", "bg-primary");
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveClass("text-muted-foreground");
  });
});

describe("cn", () => {
  it("keeps custom text sizes next to a text colour and lets later sizes win", async () => {
    const { cn } = await import("@/lib/utils");
    expect(cn("text-nano text-muted-foreground")).toBe("text-nano text-muted-foreground");
    expect(cn("text-body", "text-lead")).toBe("text-lead");
    expect(cn("h-control-md", "h-control-lg")).toBe("h-control-lg");
    expect(cn("size-avatar-md", "size-avatar-lg")).toBe("size-avatar-lg");
    expect(cn("rounded-control", "rounded-full")).toBe("rounded-full");
  });
});
