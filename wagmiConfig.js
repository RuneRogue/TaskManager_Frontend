import { configureChains, createConfig, WagmiConfig } from "wagmi";
import { publicProvider } from "wagmi/providers/public";
import { mainnet, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

const { chains, publicClient } = configureChains(
  [mainnet, sepolia], // Use Sepolia for testing
  [publicProvider()]
);

export const wagmiConfig = createConfig({
  autoConnect: true,
  publicClient,
  connectors: [injected()],
});

export function WagmiProvider({ children }) {
  return <WagmiConfig config={wagmiConfig}>{children}</WagmiConfig>;
}
