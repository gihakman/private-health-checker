import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrumSepolia } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "Private Health Checker",
  projectId: "fhenix-health-checker",
  chains: [arbitrumSepolia],
});
