import Image from "next/image";
import RoomImg from "/public/room.jpeg";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { walletContainer } from "@/container/walletContainer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import dayjs from "dayjs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";

export default function TarotApp() {
  const {
    NEAR_CONTRACT_ID,
    activeAccountId,
    nearWalletConnected,
    signInNearWallet,
    signOutNearWallet,
    viewFunction,
    callFunction,
  } = walletContainer.useContainer();

  const [readings, setReadings] = useState([]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [currentQuestionResult, setCurrentQuestionResult] = useState(null);
  const [isReadingsPanelOpen, setIsReadingsPanelOpen] = useState(false);
  const [isLoadingReadings, setIsLoadingReadings] = useState(true);

  const getReadings = useCallback(async () => {
    if (!activeAccountId) return;
    setIsLoadingReadings(true);
    try {
      const resp = await viewFunction({
        contractId: NEAR_CONTRACT_ID,
        method: "get_user_readings",
        args: {
          user_account: activeAccountId,
        },
      });
      setReadings(resp);
    } catch (error) {
      console.error("Failed to fetch readings:", error);
    } finally {
      setIsLoadingReadings(false);
    }
  }, [activeAccountId, viewFunction]);
  const getReadingsRef = useRef(getReadings);
  getReadingsRef.current = getReadings;

  const handleAskQuestion = async () => {
    if (!question.trim() || !activeAccountId) return;

    setIsLoading(true);
    try {
      // Call tarot API to get reading
      const response = await fetch("/api/tarot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.trim(),
          accountId: activeAccountId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get tarot reading");
      }

      const { readings } = await response.json();

      // Save reading to contract
      await callFunction({
        contractId: NEAR_CONTRACT_ID,
        method: "add_reading",
        args: {
          user_account: activeAccountId,
          question: question.trim(),
          cards: readings,
        },
      });

      const result = {
        question: question.trim(),
        cards: readings,
        timestamp: Date.now(),
      };
      setReadings((prev) => [...prev, result]);
      setSelectedCard(null);
      setCurrentQuestionResult(result);
      setIsReadingsPanelOpen(false);
      // Clear input after successful submission
      setQuestion("");
      alert("Your tarot reading has been saved!");
    } catch (error) {
      console.error("Error during tarot reading:", error);
      alert("Failed to get your tarot reading. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = (card) => {
    setSelectedCard(card);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAskQuestion();
    }
  };

  useEffect(() => {
    if (nearWalletConnected) {
      setIsReadingsPanelOpen(true);
      getReadingsRef.current();
    } else {
      setIsLoadingReadings(false);
      setIsReadingsPanelOpen(false);
      setReadings([]);
      setSelectedCard(null);
      setCurrentQuestionResult(null);
    }
  }, [nearWalletConnected]);

  return (
    <main className="relative">
      {isLoading && (
        <div className="fixed inset-0 z-[51] flex items-center justify-center bg-black bg-opacity-50">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      )}
      <div className="absolute top-0 right-0 z-50">
        {!nearWalletConnected ? (
          <div className="flex flex-col items-center w-screen h-screen space-y-4 pt-[20%]">
            <h1 className="text-3xl font-bold text-white">
              Welcome to Tarot App
            </h1>
            <p className="text-lg text-gray-400">
              Connect your wallet to start asking questions and get your tarot
              reading.
            </p>
            <Button
              className="text-xl font-bold text-white shadow-lg p-7 rounded-xl bg-slate-800/90 hover:bg-slate-700/90"
              size="lg"
              onClick={signInNearWallet}
            >
              Connect Wallet
            </Button>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="mt-6 mr-6 text-xl font-bold text-white shadow-lg p-7 rounded-xl bg-slate-800/90 hover:bg-slate-700/90"
                size="lg"
              >
                {activeAccountId.slice(0, 8)}...{activeAccountId.slice(-6)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[220px] shadow-xl bg-slate-900/95"
              align="end"
            >
              <DropdownMenuItem
                className="gap-2 py-3 text-base font-bold text-white cursor-pointer hover:bg-slate-800/90"
                onClick={signOutNearWallet}
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {activeAccountId && (
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 z-50 w-[400px] flex flex-col gap-4 p-4 rounded-lg shadow-lg bg-slate-800/90">
          <textarea
            className="w-full h-32 p-4 text-lg text-white rounded-lg resize-none bg-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Ask your question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <Button
            className="p-6 text-xl font-bold text-white rounded-lg shadow-lg"
            size="lg"
            onClick={handleAskQuestion}
            disabled={isLoading || !question.trim()}
          >
            {isLoading ? "Reading cards..." : "Get Reading"}
          </Button>
        </div>
      )}

      {activeAccountId && (
        <div
          className={`fixed top-0 left-0 h-screen transition-transform duration-300 ease-in-out ${
            isReadingsPanelOpen ? "translate-x-0" : "-translate-x-96"
          }`}
        >
          <div className="relative h-full">
            <div className="h-full w-96 bg-slate-900/80 backdrop-blur-sm">
              <h2 className="sticky top-0 z-10 p-6 pb-4 text-2xl font-bold text-white bg-slate-900/80 backdrop-blur-sm">
                Tarot Journal
              </h2>

              <div
                className="h-[calc(100%-4rem)] overflow-y-auto px-6 pb-6 
                  [&::-webkit-scrollbar]:w-1.5
                  [&::-webkit-scrollbar-track]:bg-transparent
                  [&::-webkit-scrollbar-thumb]:bg-slate-500/20
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb]:border-2
                  [&::-webkit-scrollbar-thumb]:border-solid
                  [&::-webkit-scrollbar-thumb]:border-transparent
                  [&::-webkit-scrollbar-thumb]:bg-clip-padding
                  hover:[&::-webkit-scrollbar-thumb]:bg-slate-500/40
                  dark:[&::-webkit-scrollbar-thumb]:bg-slate-500/20
                  dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-500/40"
              >
                {isLoadingReadings ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                    <p className="text-sm text-purple-300">
                      Reading the cards...
                    </p>
                  </div>
                ) : readings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
                    <div className="relative">
                      <Sparkles className="w-12 h-12 text-purple-400/80" />
                      <div className="absolute w-3 h-3 rounded-full -top-1 -right-1 bg-purple-400/30 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-white">
                        Your Journey Begins
                      </h3>
                      <p className="text-sm text-gray-400 max-w-[250px]">
                        Ask your first question to begin your tarot journey. The
                        cards await your curiosity.
                      </p>
                    </div>
                    <Button
                      onClick={() =>
                        document.querySelector("textarea")?.focus()
                      }
                      variant="ghost"
                      className="mt-4 text-purple-400 hover:text-purple-300 hover:bg-purple-400/10"
                    >
                      Begin Reading
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {readings.map((reading, index) => (
                      <div
                        key={index}
                        className="p-4 space-y-3 rounded-lg bg-slate-800/50"
                      >
                        <div className="text-sm text-gray-400">
                          {dayjs(reading.timestamp).format(
                            "MMMM D, YYYY h:mm A"
                          )}
                        </div>
                        <div className="font-medium text-white">
                          {reading.question}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {reading.cards.map((card, cardIndex) => {
                            if (!card) return null;
                            return (
                              <div
                                key={cardIndex}
                                className="aspect-[2/3] relative cursor-pointer transition-transform hover:scale-105"
                                onClick={() => handleCardClick(card)}
                              >
                                <Image
                                  src={card.card}
                                  alt={`Card ${card.cardName}`}
                                  fill
                                  title={`${card.cardName}: Click to view card details`}
                                  sizes="(max-width: 768px) 33vw, 20vw"
                                  className="object-cover rounded-md"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setIsReadingsPanelOpen(!isReadingsPanelOpen)}
              className="absolute top-1/2 -right-8 transform -translate-y-1/2 p-1.5 rounded-r-lg bg-slate-800/90 text-white hover:bg-slate-700/90 transition-colors"
            >
              {isReadingsPanelOpen ? (
                <ChevronLeft className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      )}

      <Dialog open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
        <DialogContent className="text-white bg-slate-900/95 border-slate-700">
          <DialogHeader>
            <div className="flex flex-col items-center gap-2 pb-2">
              <div className="flex items-center gap-2">
                {selectedCard?.isReversed ? (
                  <span className="px-2 py-0.5 text-xs font-medium text-purple-300 bg-purple-500/20 rounded-full">
                    Reversed
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-medium text-amber-300 bg-amber-500/20 rounded-full">
                    Upright
                  </span>
                )}
              </div>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                {selectedCard?.cardName}
              </DialogTitle>
              <div className="flex items-center gap-1.5 text-sm text-gray-400">
                <span>Arcana</span>
                <span className="w-1 h-1 bg-gray-600 rounded-full" />
                <span>
                  #
                  {Math.abs(selectedCard?.cardNumber)
                    .toString()
                    .padStart(2, "0")}
                </span>
              </div>
            </div>
            <div className="text-gray-300">
              <div className="mt-4 space-y-4">
                <div className="relative aspect-[2/3] w-48 mx-auto overflow-hidden rounded-lg">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  {selectedCard && (
                    <Image
                      src={selectedCard?.card}
                      alt={selectedCard?.cardName}
                      fill
                      sizes="(max-width: 768px) 192px, 192px"
                      className="object-cover"
                    />
                  )}
                </div>
                <DialogDescription className="text-base leading-relaxed">
                  {selectedCard?.result}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!currentQuestionResult}
        onOpenChange={() => setCurrentQuestionResult(null)}
      >
        <DialogContent className="text-white bg-slate-900/95 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight">
              Your Tarot Reading
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {currentQuestionResult?.cards.map((card, index) => {
                    if (!card.card) return null;
                    return (
                      <div
                        key={index}
                        className="aspect-[2/3] relative cursor-pointer transition-transform hover:scale-105"
                        onClick={() => handleCardClick(card)}
                      >
                        <Image
                          src={card.card}
                          alt={`Card ${card.cardName}`}
                          fill
                          title={`${card.cardName}: Click to view card details`}
                          sizes="(max-width: 768px) 33vw, 20vw"
                          className="object-cover rounded-md"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Image priority src={RoomImg} className="w-screen h-screen" alt="bg" />
      <div id="live2d-widget"></div>
    </main>
  );
}
