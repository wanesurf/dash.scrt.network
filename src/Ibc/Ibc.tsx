import React, { useEffect, useState, useRef } from "react";
import { Breakpoint } from "react-socks";
import { SecretNetworkClient } from "secretjs";
import { chains, Token, tokens } from "General/Utils/config";
import { faucetURL } from "General/Utils/commons";
import DepositWithdrawDialog from "Ibc/components/DepositWithdrawDialog";
import { Flip, ToastContainer, toast} from "react-toastify";

export function Ibc() {
  const [secretjs, setSecretjs] = useState<SecretNetworkClient | null>(null);
  const [secretAddress, setSecretAddress] = useState<string>("");
  const [balances, setBalances] = useState<Map<string, string>>(new Map());
  const [prices, setPrices] = useState<Map<string, number>>(new Map());
  const [loadingCoinBalances, setLoadingCoinBalances] = useState<boolean>(false);
  const [useFeegrant, setUseFeegrant] = useState<boolean>(false);
  const [selectedToken, setselectedToken] = useState<Token>(tokens.filter(token => token.name === "SCRT")[0]);
  const [isWrapping, setIsWrapping] = useState<boolean>(true);
  const [isNativeTokenPickerVisible, setIsNativeTokenPickerVisible] = useState<boolean>(false);
  const [isWrappedTokenPickerVisible, setIsWrappedTokenPickerVisible] = useState<boolean>(false);
  const nativeValue = useRef<any>();
  const wrappedValue = useRef<any>();
  const [isDepositWithdrawDialogOpen, setIsDepositWithdrawDialogOpen] =
  useState<boolean>(true);
  const [loadingWrapOrUnwrap, setLoadingWrapOrUnwrap] =
  useState<boolean>(false);

  const header = <>
  <div className="mb-4">
    <h1 className="inline text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-violet-500">
      IBC Transfer
    </h1>
  </div>
  <span className="block mb-4">
    Transfer your tokens via IBC (Inter-Blockchain Communication)
  </span>
  </>

  function handleNativePickerChoice(token: Token) {
    if (token != selectedToken) {
      setselectedToken(token);
    }
    setIsNativeTokenPickerVisible(false)
    setIsWrappedTokenPickerVisible(false)
  }
  
  const updateFeeGrantButton = (text : string, color : string) => {
    let btnFeeGrant = document.getElementById('grantButton');
    if (btnFeeGrant != null) {
      btnFeeGrant.style.color = color;
      btnFeeGrant.textContent = text;
    }
  }
  const updateCoinBalances = async () => {
    const newBalances = new Map<string, string>(balances);

    const url = `${chains["Secret Network"].lcd}/cosmos/bank/v1beta1/balances/${secretAddress}`;
    try {
      const {
        balances,
      }: {
        balances: Array<{ denom: string; amount: string }>;
      } = await (await fetch(url)).json();

      const denoms = Array.from(
        new Set(
          tokens.map((t) => t.withdrawals.map((w) => w.from_denom)).flat()
        )
      );

      for (const denom of denoms.filter((d) => !d.startsWith("secret1"))) {
        const balance = balances.find((c) => c.denom === denom)?.amount || "0";
        newBalances.set(denom, balance);
      }
    } catch (e) {
      console.error(`Error while trying to query ${url}:`, e);
    }

    if (newBalances.get("uscrt") == "0" && useFeegrant == false) {
      try {
        const response = await fetch(faucetURL, {
          method: 'POST',
          body: JSON.stringify({"Address": secretAddress}),
          headers: {'Content-Type': 'application/json'}
        });
        const result = await response;
        const textBody = await result.text();
        if (result.ok == true) {
          updateFeeGrantButton("Fee Granted for unwrapping","green");
          toast.success(`Your wallet does not have any SCRT to pay for transaction costs. Successfully sent new fee grant (0.1 SCRT) for unwrapping tokens to address ${secretAddress}`);
        } else if (textBody == "Existing Fee Grant did not expire\n") {
          updateFeeGrantButton("Fee Granted for unwrapping","green");
          toast.success(`Your wallet does not have any SCRT to pay for transaction costs. Your address ${secretAddress} however does already have an existing fee grant which will be used for unwrapping`);
        } else {
          updateFeeGrantButton("Fee Grant failed","red");
          toast.error(`Fee Grant for address ${secretAddress} failed with status code: ${result.status}`);
        }
        setUseFeegrant(true);
      }
      catch(e) {
        updateFeeGrantButton("Fee Grant failed","red");
        toast.error(`Fee Grant for address ${secretAddress} failed with error: ${e}`);
      }
      }
    setBalances(newBalances);
  };

  useEffect(() => {
    if (!secretjs || !secretAddress) {
      return;
    }

    const interval = setInterval(updateCoinBalances, 10_000);

    (async () => {
      setLoadingCoinBalances(true);
      await updateCoinBalances();
      setLoadingCoinBalances(false);
    })();

    return () => {
      clearInterval(interval);
    };
  }, [secretAddress, secretjs, useFeegrant]);

  useEffect(() => {
    fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${tokens
        .map((t) => t.coingecko_id)
        .join(",")}&vs_currencies=USD`
    )
      .then((resp) => resp.json())
      .then((result: { [coingecko_id: string]: { usd: number } }) => {
        const prices = new Map<string, number>();
        for (const token of tokens) {
          if (result[token.coingecko_id]) {
            prices.set(token.name, result[token.coingecko_id].usd);
          }
        }
        setPrices(prices);
      });
  }, []);
  
  return (
    <div>
      <div className="w-full max-w-xl mx-auto">
        <div className="border rounded-lg p-12 pb-7 border-neutral-700 bg-gradient-to-t from-black to-zinc-900/75 w-full">

        {header}


        <DepositWithdrawDialog
          token={selectedToken}
          balances={balances}
          secretAddress={secretAddress}
          secretjs={secretjs}
          isOpen={isDepositWithdrawDialogOpen}
          setIsOpen={setIsDepositWithdrawDialogOpen}
          />
        </div>
      </div>
    </div>
  );
}