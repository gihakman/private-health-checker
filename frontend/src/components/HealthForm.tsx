import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { createPublicClient, http } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import { useCofhe } from "../providers/CofheProvider";
import { HEALTH_CHECKER_ADDRESS, HEALTH_CHECKER_ABI } from "../lib/contract";

type Step = "idle" | "encrypting" | "submitting" | "confirming" | "decrypting" | "done";

export function HealthForm() {
  const { address } = useAccount();
  const { client, status: cofheStatus } = useCofhe();
  const [collateral, setCollateral] = useState("");
  const [debt, setDebt] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [result, setResult] = useState<boolean | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!client || cofheStatus !== "ready" || !address) return;

    setError(null);
    setResult(null);
    setTxHash(null);

    const collVal = BigInt(collateral || "0");
    const debtVal = BigInt(debt || "0");

    try {
      setStep("encrypting");
      const encrypted = await client
        .encryptInputs([Encryptable.uint64(collVal), Encryptable.uint64(debtVal)])
        .execute();

      setStep("submitting");
      const hash = await writeContractAsync({
        address: HEALTH_CHECKER_ADDRESS,
        abi: HEALTH_CHECKER_ABI,
        functionName: "checkHealth",
        args: [encrypted[0], encrypted[1]],
      });
      setTxHash(hash);

      setStep("confirming");
      const pub = createPublicClient({ chain: arbitrumSepolia, transport: http() });
      await pub.waitForTransactionReceipt({ hash });

      setStep("decrypting");
      await client.permits.getOrCreateSelfPermit();

      // Read the ciphertext handle
      const ctHash = await pub.readContract({
        address: HEALTH_CHECKER_ADDRESS,
        abi: HEALTH_CHECKER_ABI,
        functionName: "latestResult",
        args: [address],
      });

      const decrypted = await client.decryptForView(ctHash, FheTypes.Bool).execute();
      setResult(Boolean(decrypted));
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStep("idle");
    }
  }

  const isLoading = step !== "idle" && step !== "done";

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="collateral">Collateral (USD)</label>
          <input
            id="collateral"
            type="number"
            min="0"
            value={collateral}
            onChange={(e) => setCollateral(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>
        <div>
          <label htmlFor="debt">Debt (USD)</label>
          <input
            id="debt"
            type="number"
            min="0"
            value={debt}
            onChange={(e) => setDebt(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>
        <button type="submit" disabled={isLoading || cofheStatus !== "ready"}>
          {isLoading ? stepLabel(step) : "Check Health Privately"}
        </button>
      </form>

      {txHash && (
        <p>
          Tx:{" "}
          <a
            href={`https://sepolia.arbiscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </a>
        </p>
      )}

      {result !== null && (
        <div className={result ? "result-safe" : "result-unsafe"}>
          <h2>{result ? "✓ Safe" : "✗ At Risk"}</h2>
          <p>
            {result
              ? "No liquidation risk detected."
              : "Position is below the 150% threshold. Add collateral or repay debt."}
          </p>
          <p className="privacy-note">
            Your collateral, debt, and health factor were never revealed on-chain.
          </p>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}

function stepLabel(step: Step): string {
  switch (step) {
    case "encrypting": return "Encrypting...";
    case "submitting": return "Submitting tx...";
    case "confirming": return "Waiting for confirmation...";
    case "decrypting": return "Decrypting result...";
    default: return "Processing...";
  }
}
