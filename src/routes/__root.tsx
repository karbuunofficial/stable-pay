import { HeadContent, Outlet, Link, createRootRoute, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { queryClient } from "@/lib/queryClient";
import { AppShell } from "@/components/amixof/shell";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-6xl font-bold text-foreground">404</h1>
        <h2 className="type-title mt-3">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
        <div className="mt-6">
          <Button asChild><Link to="/">Go home</Link></Button>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="type-title">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. You can try again or head back home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={() => { router.invalidate(); reset(); }}>Try again</Button>
          <Button variant="outline" asChild><a href="/">Go home</a></Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  // fallback title; each route overrides it through its own head()
  head: () => ({ meta: [{ title: "AMIXOF × StablePay" }] }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HeadContent />
        <AppShell>
          <Outlet />
        </AppShell>
        <Toaster position="bottom-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
