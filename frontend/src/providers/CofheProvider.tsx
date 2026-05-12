import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { createCofheConfig, createCofheClient } from "@cofhe/sdk/web";
import { chains } from "@cofhe/sdk/chains";

type CofheStatus = "idle" | "connecting" | "ready" | "error";

interface CofheContextValue {
  client: ReturnType<typeof createCofheClient> | null;
  status: CofheStatus;
  error: string | null;
}

const CofheContext = createContext<CofheContextValue>({
  client: null,
  status: "idle",
  error: null,
});

export function CofheProvider({ children }: { children: ReactNode }) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [status, setStatus] = useState<CofheStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<ReturnType<typeof createCofheClient> | null>(null);

  useEffect(() => {
    if (!publicClient || !walletClient) {
      setStatus("idle");
      clientRef.current = null;
      return;
    }

    let cancelled = false;

    async function init() {
      setStatus("connecting");
      setError(null);
      try {
        const config = createCofheConfig({
          supportedChains: [chains.arbitrumSepolia],
        });
        const client = createCofheClient(config);
        await client.connect(publicClient!, walletClient!);
        if (cancelled) return;
        clientRef.current = client;
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "CoFHE init failed");
        setStatus("error");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [publicClient, walletClient]);

  return (
    <CofheContext.Provider
      value={{ client: clientRef.current, status, error }}
    >
      {children}
    </CofheContext.Provider>
  );
}

export function useCofhe() {
  return useContext(CofheContext);
}
