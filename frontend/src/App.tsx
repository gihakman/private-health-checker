import "@rainbow-me/rainbowkit/styles.css";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { useCofhe } from "./providers/CofheProvider";
import { HealthForm } from "./components/HealthForm";

function App() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { status: cofheStatus, error: cofheError } = useCofhe();
  const wrongChain = isConnected && chainId !== arbitrumSepolia.id;

  return (
    <div className="app">
      <header>
        <h1>Private DeFi Health Checker</h1>
        <p>Check your liquidation risk without revealing your position.</p>
        <ConnectButton />
      </header>

      <main>
        {!isConnected && <p>Connect your wallet to get started.</p>}

        {wrongChain && (
          <p className="error">
            Switch to Arbitrum Sepolia to use this dApp.
          </p>
        )}

        {isConnected && !wrongChain && (
          <>
            <p className="cofhe-status">
              CoFHE: {cofheStatus}
              {cofheError && ` — ${cofheError}`}
            </p>
            <HealthForm />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
