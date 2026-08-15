import { useAuth as useClerkAuth } from "@clerk/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { useMemo, type ReactNode } from "react";
import superjson from "superjson";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";

const queryClient = new QueryClient();

function redirectToLoginIfUnauthorized(error: unknown) {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  if (error.message !== UNAUTHED_ERR_MSG) return;
  if (window.location.pathname.startsWith("/sign-in")) return;
  window.location.href = getLoginUrl();
}

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    redirectToLoginIfUnauthorized(event.query.state.error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    redirectToLoginIfUnauthorized(event.mutation.state.error);
  }
});

function TrpcProvider({ children }: { children: ReactNode }) {
  const { getToken, isLoaded } = useClerkAuth();

  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          httpBatchLink({
            url: "/api/trpc",
            transformer: superjson,
            async fetch(input, init) {
              const headers = new Headers(init?.headers);
              if (isLoaded) {
                const token = await getToken();
                if (token) {
                  headers.set("Authorization", `Bearer ${token}`);
                }
              }
              return globalThis.fetch(input, {
                ...(init ?? {}),
                headers,
                credentials: "include",
              });
            },
          }),
        ],
      }),
    [getToken, isLoaded]
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return <TrpcProvider>{children}</TrpcProvider>;
}
