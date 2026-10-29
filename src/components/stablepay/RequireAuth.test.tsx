import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

let auth = { isAuthenticated: false, isLoading: false, user: null as null | { username?: string } };
let configured = true;
vi.mock("@/context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/utils/supabase", () => ({ get supabaseConfigured() { return configured; } }));
vi.mock("@/components/auth/LoginForm", () => ({ default: () => <div>LOGIN FORM</div> }));
vi.mock("@/components/auth/UsernameSetup", () => ({ default: () => <div>USERNAME SETUP</div> }));

import RequireAuth from "@/components/stablepay/RequireAuth";

const ui = () => render(<RequireAuth><div>SECRET PAGE</div></RequireAuth>);

beforeEach(() => {
  auth = { isAuthenticated: false, isLoading: false, user: null };
  configured = true;
});

describe("RequireAuth", () => {
  it("shows a setup message, not a crash, when Supabase isn't configured", () => {
    configured = false;
    ui();
    expect(screen.getByText(/isn't set up yet/i)).toBeInTheDocument();
    expect(screen.queryByText("SECRET PAGE")).not.toBeInTheDocument();
  });

  it("always has exactly one page heading, even in the setup and loading states", () => {
    configured = false;
    const { unmount } = ui();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    unmount();
    configured = true;
    auth.isLoading = true;
    ui();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("shows a loading status while the session is being checked, never the page or the login form", () => {
    auth.isLoading = true;
    ui();
    expect(screen.getByRole("status")).toHaveTextContent(/checking your session/i);
    expect(screen.queryByText("SECRET PAGE")).not.toBeInTheDocument();
    expect(screen.queryByText("LOGIN FORM")).not.toBeInTheDocument();
  });

  it("shows the login form when signed out", () => {
    ui();
    expect(screen.getByText("LOGIN FORM")).toBeInTheDocument();
    expect(screen.queryByText("SECRET PAGE")).not.toBeInTheDocument();
  });

  it("asks for a username before showing the page", () => {
    auth = { isAuthenticated: true, isLoading: false, user: {} };
    ui();
    expect(screen.getByText("USERNAME SETUP")).toBeInTheDocument();
    expect(screen.queryByText("SECRET PAGE")).not.toBeInTheDocument();
  });

  it("shows the page once signed in with a username", () => {
    auth = { isAuthenticated: true, isLoading: false, user: { username: "me" } };
    ui();
    expect(screen.getByText("SECRET PAGE")).toBeInTheDocument();
  });

  it("does not trust a user object alone: must be authenticated", () => {
    auth = { isAuthenticated: false, isLoading: false, user: { username: "me" } };
    ui();
    expect(screen.queryByText("SECRET PAGE")).not.toBeInTheDocument();
  });
});
