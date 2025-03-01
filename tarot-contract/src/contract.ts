// Find all our documentation at https://docs.near.org
import { call, LookupMap, near, NearBindgen, view } from "near-sdk-js";

// Define the interface for card details
interface CardDetail {
  card: string;
  result: string;
  cardNumber: number;
  cardName: string;
  isReversed: boolean;
}

// Define the interface for tarot reading results
interface TarotReading {
  question: string;
  cards: CardDetail[];
  timestamp: bigint;
}

@NearBindgen({})
export class TarotContract {
  private readings: LookupMap<TarotReading[]>;

  constructor() {
    this.readings = new LookupMap<TarotReading[]>("r"); // "r" is a unique prefix for this storage
  }

  @view({})
  get_user_readings({
    user_account,
  }: {
    user_account: string;
  }): TarotReading[] {
    // Return empty array if user has no readings
    return this.readings.get(user_account) || [];
  }

  @call({})
  add_reading({
    user_account,
    question,
    cards,
  }: {
    user_account: string;
    question: string;
    cards: CardDetail[];
  }): void {
    // Validate input
    if (!question || !cards || cards.length !== 3) {
      throw new Error(
        "Invalid input: question and exactly 3 cards are required"
      );
    }

    // Validate each card's data structure
    for (const card of cards) {
      if (!card.result || !card.cardName || card.cardNumber === undefined) {
        throw new Error("Invalid card detail format");
      }
    }

    // Create new reading
    const newReading: TarotReading = {
      question,
      cards,
      timestamp: near.blockTimestamp(),
    };

    // Get user's existing readings
    let userReadings = this.readings.get(user_account) || [];

    // Add new reading
    userReadings.push(newReading);

    // Update storage
    this.readings.set(user_account, userReadings);

    // Log the event
    near.log(`New tarot reading saved for user ${user_account}`);
  }
}
