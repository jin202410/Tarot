import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Near, providers } from "near-api-js";
import { distinctUntilChanged, map } from "rxjs";
import "@near-wallet-selector/modal-ui/styles.css";
import { setupModal } from "@near-wallet-selector/modal-ui";
import { setupWalletSelector } from "@near-wallet-selector/core";
import { setupHereWallet } from "@near-wallet-selector/here-wallet";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupLedger } from "@near-wallet-selector/ledger";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupSender } from "@near-wallet-selector/sender";
import { setupBitteWallet } from "@near-wallet-selector/bitte-wallet";

import { createContainer } from "../hooks/useContainer";

const DEFAULT_GAS = "30000000000000";
const DEFAULT_DEPOSIT = "0";
const NEAR_CONTRACT_NAME = process.env.NEAR_CONTRACT_NAME;
const NEAR_NETWORK_ID = process.env.NEAR_NETWORK_ID;

const nearNetwork =
  NEAR_NETWORK_ID === "mainnet"
    ? {
        networkId: "mainnet",
        keyStore: new keyStores.BrowserLocalStorageKeyStore(),
        nodeUrl: "https://near.lava.build",
        walletUrl: "https://app.mynearwallet.com",
        helperUrl: "https://helper.near.org",
      }
    : {
        networkId: "testnet",
        nodeUrl: "https://rpc.testnet.near.org",
        walletUrl: "https://testnet.mynearwallet.com",
        helperUrl: "https://helper.testnet.near.org",
      };

class WalletError extends Error {
  constructor(message) {
    super(message);
    this.name = "WalletError";
  }
}

function useWalletContainer() {
  const nearRef = useRef(null);
  const [selector, setSelector] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [modal, setModal] = useState(null);

  const activeAccountId = useMemo(() => {
    return accounts.find((account) => account.active)?.accountId || null;
  }, [accounts]);

  const nearWalletConnected = useMemo(() => {
    return !!activeAccountId;
  }, [activeAccountId]);

  const getNear = useCallback(() => {
    if (nearRef.current) return nearRef.current;
    return new Near(nearNetwork);
  }, []);

  const getNearAccount = useCallback(async () => {
    if (!activeAccountId) {
      throw new WalletError("No wallet connected");
    }
    return getNear().account(activeAccountId);
  }, [activeAccountId, getNear]);

  const setupWallet = useCallback(async () => {
    try {
      const selector = await setupWalletSelector({
        network: nearNetwork,
        // debug: true,
        modules: [
          setupMyNearWallet(),
          setupHereWallet(),
          setupLedger(),
          setupMeteorWallet(),
          setupSender(),
          setupBitteWallet(),
        ],
      });

      const modal = setupModal(selector, {
        contractId: NEAR_CONTRACT_NAME,
      });
      const state = selector.store.getState();
      
      setSelector(selector);
      setModal(modal);
      setAccounts(state.accounts || []);
    } catch (error) {
      console.error("Failed to setup Near wallet", error);
    }
  }, [])

  const signInNearWallet = useCallback(() => {
    if (!modal) return;
    modal.show();
  }, [modal]);

  const signOutNearWallet = useCallback(async () => {
    if (!selector) return;
    const wallet = await selector.wallet();
    wallet.signOut().catch((e) => {
      logger.error("Failed to sign out", e);
    });
  }, [selector]);

  const viewFunction = useCallback(
    async ({ contractId, method, args = {} }) => {
      const nearAccount = await getNearAccount();
      return await nearAccount.viewFunction({
        contractId,
        methodName: method,
        args,
      });
    },
    [getNearAccount],
  );

  const callFunction = useCallback(
    async ({
      contractId,
      method,
      args = {},
      gas = DEFAULT_GAS,
      deposit = DEFAULT_DEPOSIT,
    }) => {
      if (!selector) {
        throw new WalletError("No wallet connected");
      }
      const wallet = await selector.wallet();
      if (!wallet) {
        throw new WalletError("No wallet connected");
      }

      const outcome = await wallet.signAndSendTransaction({
        receiverId: contractId,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: method,
              args,
              gas: gas.toString(),
              deposit: deposit.toString(),
            },
          },
        ],
      });

      return providers.getTransactionLastResult(outcome);
    },
    [selector]
  );

  useEffect(() => {
    if (!selector) return;

    const subscription = selector.store.observable
      .pipe(
        map((state) => state.accounts),
        distinctUntilChanged()
      )
      .subscribe((nextAccounts) => {
        setAccounts(nextAccounts);
      });

    return () => subscription.unsubscribe();
  }, [selector]);

  useEffect(() => {
    setupWallet()
  }, [setupWallet])

  return {
    activeAccountId,
    nearWalletConnected,
    signInNearWallet,
    signOutNearWallet,
    viewFunction,
    callFunction,
  }
}

const walletContainer = createContainer(useWalletContainer);

export {
  walletContainer,
}