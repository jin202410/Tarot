import { walletContainer } from "@/container/walletContainer";
import TarotApp from "@/components/ui/tarot";
import { Toaster } from "react-hot-toast";

export default function Home() {
  return (
    <walletContainer.Provider>
      <TarotApp />
      <Toaster />
    </walletContainer.Provider>
  );
}
