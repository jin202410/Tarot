import { walletContainer } from "@/container/walletContainer";
import TarotApp from "@/components/ui/tarot";

export default function Home() {
  return (
    <walletContainer.Provider>
      <TarotApp />
    </walletContainer.Provider>
  );
}
