import anyTest from "ava";
import { Worker } from "near-workspaces";
import { setDefaultResultOrder } from "dns";
setDefaultResultOrder("ipv4first"); // temp fix for node >v17

/**
 *  @typedef {import('near-workspaces').NearAccount} NearAccount
 *  @type {import('ava').TestFn<{worker: Worker, accounts: Record<string, NearAccount>}>}
 */
const test = anyTest;

test.beforeEach(async (t) => {
  // Create sandbox
  const worker = (t.context.worker = await Worker.init());

  // Deploy contract
  const root = worker.rootAccount;
  const contract = await root.createSubAccount("test-account");

  // Get wasm file path from package.json test script in folder above
  await contract.deploy(process.argv[2]);

  // Save state for test runs, it is unique for each test
  t.context.accounts = { root, contract };
});

test.afterEach.always(async (t) => {
  await t.context.worker.tearDown().catch((error) => {
    console.log("Failed to stop the Sandbox:", error);
  });
});

test("returns empty array for new user", async (t) => {
  const { contract } = t.context.accounts;
  const readings = await contract.view("get_user_readings", {
    user_account: "alice.test.near",
  });
  t.deepEqual(readings, []);
});

test("adds a new reading and retrieves it", async (t) => {
  const { root, contract } = t.context.accounts;

  // Add a new reading
  await root.call(contract, "add_reading", {
    user_account: root.accountId,
    question: "What's my future?",
    cards: [
      {
        result: "The beginning of a new journey awaits you",
        cardNumber: 0,
        cardName: "The Fool",
        isReversed: false,
      },
      {
        result: "Hope and inspiration guide your path",
        cardNumber: 17,
        cardName: "The Star",
        isReversed: false,
      },
      {
        result: "Completion and fulfillment are near",
        cardNumber: 21,
        cardName: "The World",
        isReversed: false,
      },
    ],
  });

  // Get the readings
  const readings = await contract.view("get_user_readings", {
    user_account: root.accountId,
  });

  t.is(readings.length, 1);
  t.is(readings[0].question, "What's my future?");
  t.is(readings[0].cards.length, 3);
  t.is(readings[0].cards[0].cardName, "The Fool");
  t.is(readings[0].cards[1].cardName, "The Star");
  t.is(readings[0].cards[2].cardName, "The World");
  t.truthy(readings[0].timestamp);
});

test("adds multiple readings for the same user", async (t) => {
  const { root, contract } = t.context.accounts;

  const reading1Cards = [
    {
      result: "The beginning of a new journey awaits you",
      cardNumber: 0,
      cardName: "The Fool",
      isReversed: false,
    },
    {
      result: "Hope and inspiration guide your path",
      cardNumber: 17,
      cardName: "The Star",
      isReversed: false,
    },
    {
      result: "Completion and fulfillment are near",
      cardNumber: 21,
      cardName: "The World",
      isReversed: false,
    },
  ];

  const reading2Cards = [
    {
      result: "Your intuition is heightened",
      cardNumber: 18,
      cardName: "The Moon",
      isReversed: false,
    },
    {
      result: "Success and positivity shine through",
      cardNumber: 19,
      cardName: "The Sun",
      isReversed: false,
    },
    {
      result: "Sudden change brings transformation",
      cardNumber: 16,
      cardName: "The Tower",
      isReversed: false,
    },
  ];

  // Add first reading
  await root.call(contract, "add_reading", {
    user_account: root.accountId,
    question: "First question",
    cards: reading1Cards,
  });

  // Add second reading
  await root.call(contract, "add_reading", {
    user_account: root.accountId,
    question: "Second question",
    cards: reading2Cards,
  });

  // Get the readings
  const readings = await contract.view("get_user_readings", {
    user_account: root.accountId,
  });

  t.is(readings.length, 2);
  t.is(readings[0].question, "First question");
  t.is(readings[1].question, "Second question");
  t.deepEqual(readings[0].cards, reading1Cards);
  t.deepEqual(readings[1].cards, reading2Cards);
});

test("validates input requirements", async (t) => {
  const { root, contract } = t.context.accounts;

  const validCard = {
    result: "The beginning of a new journey awaits you",
    cardNumber: 0,
    cardName: "The Fool",
    isReversed: false,
  };

  // Test with invalid number of cards
  await t.throwsAsync(
    async () => {
      await root.call(contract, "add_reading", {
        user_account: root.accountId,
        question: "Invalid reading",
        cards: [validCard, validCard], // Only 2 cards instead of 3
      });
    },
    { instanceOf: Error }
  );

  // Test with empty question
  await t.throwsAsync(
    async () => {
      await root.call(contract, "add_reading", {
        user_account: root.accountId,
        question: "",
        cards: [validCard, validCard, validCard],
      });
    },
    { instanceOf: Error }
  );

  // Test with invalid card format
  await t.throwsAsync(
    async () => {
      await root.call(contract, "add_reading", {
        user_account: root.accountId,
        question: "Invalid card format",
        cards: [
          validCard,
          { ...validCard, result: "" }, // Missing result
          validCard,
        ],
      });
    },
    { instanceOf: Error }
  );
});
