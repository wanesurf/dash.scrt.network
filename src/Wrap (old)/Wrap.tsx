import React, { useEffect, useState, useContext, createContext } from "react";
import { Breakpoint } from "react-socks";
import { MsgExecuteContract, SecretNetworkClient } from "secretjs";
import { chains, Token, tokens } from "General/Utils/config";
import { sleep, faucetURL, faucetAddress, viewingKeyErrorString, usdString} from "General/Utils/commons";
import { KeplrContext } from "General/Layouts/defaultLayout";
import BigNumber from "bignumber.js";
import { Flip, ToastContainer, toast} from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownLong, faUpLong, faArrowRightArrowLeft, faCaretDown } from '@fortawesome/free-solid-svg-icons'
import { getKeplrViewingKey, setKeplrViewingKey } from "General/Components/Keplr";

export const WrapContext = createContext(null);

export function Wrap() {

  enum WrappingMode {
    Wrap,
    Unwrap
  }

  const {secretjs, secretAddress} = useContext(KeplrContext);

  const [price, setPrice] = useState <number>();
  const [amountToWrap, setAmountToWrap] = useState <string>();
  const [wrappingMode, setWrappingMode] = useState<WrappingMode>(WrappingMode.Wrap);
  const [selectedToken, setselectedToken] = useState<Token>(tokens.filter(token => token.name === "SCRT")[0]);

  // UI
  const [isNativeTokenPickerVisible, setIsNativeTokenPickerVisible] = useState<boolean>(false);
  const [isWrappedTokenPickerVisible, setIsWrappedTokenPickerVisible] = useState<boolean>(false);
  const [nativeAmountValidationMessage, setNativeAmountValidationMessage] = useState<string>("");
  const [isValidNativeAmount, setIsValidNativeAmount] = useState<boolean>(true);

  const [useFeegrant, setUseFeegrant] = useState<boolean>(false);

  const [loadingWrapOrUnwrap, setLoadingWrapOrUnwrap] = useState<boolean>(false);
  const [loadingTokenBalance, setLoadingTokenBalance] = useState<boolean>(false);
  const [loadingCoinBalance, setLoadingCoinBalance] = useState<boolean>(false);

  const [tokenNativeBalance, setTokenNativeBalance] = useState<string>("");
  const [tokenWrappedBalance, setTokenWrappedBalance] = useState<string>("");

  const handleInputChange = e => {
    setAmountToWrap(e.target.value);

    const availableAmount = Number(tokenNativeBalance) * (10**(-selectedToken.decimals));

    const numberRegex = /^-?[0-9]+([.,][0-9]+)?$/;

    function matchExact(r, str) {
      var match = str.match(r);
      return match && str === match[0];
    }

    if (Number(e.target.value) > Number(availableAmount)) {
      setNativeAmountValidationMessage("Not enough balance");
      setIsValidNativeAmount(false);
    } else if (!matchExact(numberRegex, e.target.value)) {
      setNativeAmountValidationMessage("Please enter a valid number");
      setIsValidNativeAmount(false);
    } else {
      setIsValidNativeAmount(true);
    }
  };

  // handles [25% | 50% | 75% | Max] Button-Group
  function setAmountByPercentage(percentage: number) {
    if (tokenNativeBalance) {
      let availableAmount = Number(tokenNativeBalance) * (10**(-selectedToken.decimals));
      let potentialInput = new BigNumber(availableAmount * (percentage * 0.01)).toFormat();
      if (Number(potentialInput) == 0) {
        setAmountToWrap("");
      } else {
        setAmountToWrap(potentialInput);
      }

      const numberRegex = /^-?[0-9]+([.,][0-9]+)?$/;

      function matchExact(r, str) {
        var match = str.match(r);
        return match && str === match[0];
      }

      if (Number(amountToWrap) > Number(availableAmount)) {
        setNativeAmountValidationMessage("Not enough balance");
        setIsValidNativeAmount(false);
      } else if (!matchExact(numberRegex, amountToWrap)) {
        setNativeAmountValidationMessage("Please enter a valid number");
        setIsValidNativeAmount(false);
      } else {
        setIsValidNativeAmount(true);
      }
    }
  }

  async function handlePickerChoice(token: Token) {
    if (token != selectedToken) {
      setselectedToken(token);
      setAmountToWrap("");
    }
    setIsNativeTokenPickerVisible(false)
    setIsWrappedTokenPickerVisible(false)

    try {
      setLoadingCoinBalance(true);
      setLoadingTokenBalance(true);
      await updateCoinBalance();
      await updateTokenBalance();
    } finally {
      setLoadingCoinBalance(false);
      setLoadingTokenBalance(false);
    }
  }

  const updateTokenBalance = async () => {
    if (!selectedToken.address || !secretjs) {
      return;
    }

    const key = await getKeplrViewingKey(selectedToken.address);
    if (!key) {
      setTokenWrappedBalance(viewingKeyErrorString);
      return;
    }

    try {
      const result: {
        viewing_key_error: any;
        balance: {
          amount: string;
        };
      } = await secretjs.query.compute.queryContract({
        contractAddress: selectedToken.address,
        codeHash: selectedToken.code_hash,
        query: {
          balance: { address: secretAddress, key },
        },
      });

      if (result.viewing_key_error) {
        setTokenWrappedBalance(viewingKeyErrorString);
        return;
      }

      setTokenWrappedBalance(result.balance.amount);
    } catch (e) {
      console.error(`Error getting balance for s${selectedToken.name}`, e);

      setTokenWrappedBalance(viewingKeyErrorString);
    }
  };

  function Header(props: { title: string; text: string; }) {
        return <>
          <div className="mb-4">
            <h1 className="inline text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-violet-500">
              {props.title}
            </h1>
          </div>
          <span className="block mb-4">
            {props.text}
          </span>
        </>
  }

  function PercentagePicker() {
    return (
      <div className="inline-flex rounded-full">
        <button onClick={() => setAmountByPercentage(25)} className="py-0.5 px-1.5 font-medium rounded-l-full border focus:z-10 focus:ring-2 bg-zinc-800 border-zinc-600 text-white hover:text-black hover:bg-white active:bg-zinc-300 transition-colors disabled:text-gray-400 disabled:hover:bg-zinc-800 disabled:hover:text-gray-400 disabled:hover:border-zinc-600" disabled={!secretAddress}>25%</button>
        <button onClick={() => setAmountByPercentage(50)} className="py-0.5 px-1.5 font-medium border-t border-b border-r focus:z-10 focus:ring-2 bg-zinc-800 border-zinc-600 text-white hover:text-black hover:bg-white active:bg-zinc-300 transition-colors disabled:text-gray-400 disabled:hover:bg-zinc-800 disabled:hover:text-gray-400 disabled:hover:border-zinc-600" disabled={!secretAddress}>50%</button>
        <button onClick={() => setAmountByPercentage(75)} className="py-0.5 px-1.5 font-medium border-t border-b focus:z-10 focus:ring-2 bg-zinc-800 border-zinc-600 text-white hover:text-black hover:bg-white active:bg-zinc-300 transition-colors disabled:text-gray-400 disabled:hover:bg-zinc-800 disabled:hover:text-gray-400 disabled:hover:border-zinc-600" disabled={!secretAddress}>75%</button>
        <button onClick={() => setAmountByPercentage(100)} className="py-0.5 px-1.5 font-medium rounded-r-full border focus:z-10 focus:ring-2 bg-zinc-800 border-zinc-600 text-white hover:text-black hover:bg-white active:bg-zinc-300 transition-colors disabled:text-gray-400 disabled:hover:bg-zinc-800 disabled:hover:text-gray-400 disabled:hover:border-zinc-600" disabled={!secretAddress}>Max</button>
      </div>
    )
  }

  function NativeTokenBalanceUi() {
    if (!loadingCoinBalance && secretjs && secretAddress) {
      return (
        <>
          {`Available: ${new BigNumber(tokenNativeBalance!)
            .dividedBy(`1e${selectedToken.decimals}`)
            .toFormat()}`} {selectedToken.name} ({usdString.format(
          new BigNumber(tokenNativeBalance!)
            .dividedBy(`1e${selectedToken.decimals}`)
            .multipliedBy(Number(price))
            .toNumber()
          )})
        </>
      );
    } else {
      return (
        <></>
      )
    }
  }

  function WrappedTokenBalanceUi() {
    if (!secretjs || loadingTokenBalance || tokenWrappedBalance == viewingKeyErrorString) {
      return (
        <div className="h-4"></div>
      );
    } else if (Number(tokenWrappedBalance) > -1) {
      return (
        <>
          {/* Available: 0.123456 sSCRT () */}
          {`Available: ${new BigNumber(tokenWrappedBalance!)
                .dividedBy(`1e${selectedToken.decimals}`)
                .toFormat()} s` + selectedToken.name + ` (${usdString.format(
            new BigNumber(tokenWrappedBalance!)
              .dividedBy(`1e${selectedToken.decimals}`)
              .multipliedBy(Number(price))
              .toNumber()
            )})`}
        </>
      )
    }
  }

  function NativeTokenInputComponent() {
    return (
      <>
        {!isValidNativeAmount && (
          <div className="text-red-500 text-xs text-right mb-2">{nativeAmountValidationMessage}</div>
        )}
        {/* Validation Message */}
        {isValidNativeAmount && (
          <div className="h-4 mb-2"></div>
        )}

        { isNativeTokenPickerVisible &&
          <div className="relative">
            <ul className="overflow-y-scroll scrollbar-hide h-64 text-white z-20 mt-16 rounded bg-zinc-900 ring-1 ring-zinc-800 absolute left-0 right-0">
              {tokens.map(token => (
                <li className="cursor-pointer select-none p-2 bg-zinc-900 hover:bg-black flex items-center bg-red-500" onClick={() => handlePickerChoice(token)} key={token.name}>
                  <img src={token.image} alt="Logo" className="w-7 h-7 mr-2"/>
                  {token.name}
                </li>
              ))}
            </ul>
          </div>
        }

        <div className="flex">
          <button onClick={() => {setIsNativeTokenPickerVisible(!isNativeTokenPickerVisible); setIsWrappedTokenPickerVisible(false)}} className="hover:bg-zinc-700 active:bg-zinc-800 transition-colors inline-flex items-center px-3 text-sm font-semibold bg-zinc-800 rounded-l-md border border-r-0 border-zinc-900 text-zinc-400 focus:bg-zinc-700 disabled:hover:bg-zinc-800" disabled={!selectedToken.address || !secretAddress}>
            <img src={selectedToken.image} alt={selectedToken.name} className="w-7 h-7 mr-2"/>
            {selectedToken.name}
            <FontAwesomeIcon icon={faCaretDown} className="ml-2" />
          </button>
          <input value={amountToWrap} onChange={handleInputChange} type="text" className={" block flex-1 min-w-0 w-full bg-zinc-900 text-white p-4 rounded-r-md disabled:placeholder-zinc-700 transition-colors border border-zinc-800" + (!isValidNativeAmount ? "  border-red-500" : "")} name="nativeValue" id="nativeValue" placeholder="Amount" disabled={!selectedToken.address || !secretAddress}/>
        </div>

        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 mt-3">
          <div className="flex-1 text-xs"><NativeTokenBalanceUi/></div>
          <div className="sm:flex-initial text-xs"><PercentagePicker/></div>
        </div>
      </>
    )
  }

  function WrappedTokenInputComponent() {
    return (
      <>
        <div>
          {/* Validation Message */}
          {!isValidNativeAmount && (
            <div className="text-red-500 text-xs text-right mb-2">{nativeAmountValidationMessage}</div>
          )}
          {/* Validation Message */}
          {isValidNativeAmount && (
            <div className="h-4 mb-2"></div>
          )}

          {/* Wrapped Token Picker */}
          { isWrappedTokenPickerVisible &&
            <div className="relative">
              <ul className="overflow-y-scroll scrollbar-hide h-64 text-white z-20 absolute mt-16 rounded bg-black ring-1 ring-zinc-800 left-0 right-0">
                {tokens.map(token => (
                  <li className="cursor-pointer select-none p-2 hover:bg-zinc-800 flex items-center" onClick={() => handlePickerChoice(token)} key={token.name}>
                    <img src={token.image} alt="Logo" className="w-7 h-7 mr-2"/>
                    {`s` + token.name}
                  </li>
                ))}
              </ul>
            </div>
          }

          <div className="flex">
            <button onClick={() => {setIsWrappedTokenPickerVisible(!isWrappedTokenPickerVisible); setIsNativeTokenPickerVisible(false)}} className="hover:bg-zinc-700 active:bg-zinc-800 transition-colors inline-flex items-center px-3 text-sm font-semibold bg-zinc-800 rounded-l-md border border-r-0 border-zinc-900 text-zinc-400 focus:bg-zinc-700 disabled:hover:bg-zinc-800" disabled={!selectedToken.address || !secretAddress}>
              <img src={selectedToken.image} alt={selectedToken.name} className="w-7 h-7 mr-2" />
              s{selectedToken.name}
              <FontAwesomeIcon icon={faCaretDown} className="ml-2" />
            </button>
            <input value={amountToWrap} onChange={handleInputChange} type="text" className={"block flex-1 min-w-0 w-full bg-zinc-900 text-white p-4 rounded-r-md disabled:placeholder-zinc-700 transition-colors" + (!isValidNativeAmount ? " border border-red-500" : "")} name="wrappedValue" id="wrappedValue" placeholder="Amount" disabled={!selectedToken.address || !secretAddress}/>
          </div>
        </div>


        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 mt-3">
          <div className="flex-1 text-xs"><WrappedTokenBalanceUi/></div>
          <div className="sm:flex-initial text-xs"><PercentagePicker/></div>
        </div>
      </>
    )
  }

  function WrappingModeSwitchInputComponent(props: { wrappingMode: WrappingMode; disabled: boolean; }) {
    const handleSetWrapping = () => { setWrappingMode(WrappingMode.Wrap) };
    const handleSetUnwrapping = () => { setWrappingMode(WrappingMode.Unwrap) };
    const disabled = props.disabled;

    return (
      <div className="space-x-4 text-center my-12">
        <button onClick={handleSetWrapping} disabled={disabled} className={(wrappingMode === WrappingMode.Wrap ? "border border-blue-500 bg-blue-500/40" : "hover:bg-zinc-700 active:bg-zinc-800") + " py-1 px-3 font-semibold rounded-md border transition-colors disabled:bg-zinc-500 disabled:text-zinc-900 disabled:border-zinc-500"}><FontAwesomeIcon icon={faDownLong} className="mr-2" />Wrap</button>
        <button onClick={handleSetUnwrapping} disabled={disabled} className={(wrappingMode === WrappingMode.Unwrap ? "border border-blue-500 bg-blue-500/40" : "hover:bg-zinc-700 active:bg-zinc-800") + " py-1 px-3 font-semibold rounded-md border transition-colors disabled:bg-zinc-500 disabled:text-zinc-900 disabled:border-zinc-500"}><FontAwesomeIcon icon={faUpLong} className="mr-2" />Unwrap</button>
      </div>
    )
  }

  function SubmitButton(props: { disabled: boolean; amountToWrap: string | undefined; nativeCurrency: string; wrappedAmount: string | undefined; wrappedCurrency: string; wrappingMode: WrappingMode }) {
    const disabled = props.disabled;
    const amountToWrap = props.amountToWrap;
    const nativeCurrency = props.nativeCurrency;
    const wrappedCurrency = props.wrappedCurrency;
    const wrappingMode = props.wrappingMode;

    return (
      <button
        disabled={disabled}
        className="flex items-center justify-center disabled:bg-zinc-500 disabled:border-zinc-500 disabled:opacity-40 w-full py-3 px-3 bg-emerald-500/50 rounded border border-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 transition-colors font-semibold mt-12"
        onClick={async () => {

          if (!secretjs || !secretAddress) { return; }

          const baseAmount = amountToWrap;
          const amount = new BigNumber(Number(baseAmount))
            .multipliedBy(`1e${selectedToken.decimals}`)
            .toFixed(0, BigNumber.ROUND_DOWN);

          if (amount === "NaN") {
            console.error("NaN amount", baseAmount);
            return;
          }
          
          try {
            setLoadingWrapOrUnwrap(true);
            const toastId = toast.loading(
              wrappingMode === WrappingMode.Wrap ? `Wrapping ${selectedToken.name}` : `Unwrapping ${selectedToken.name}`, { closeButton: true }
            );
            if (wrappingMode === WrappingMode.Wrap) {
              const tx = await secretjs.tx.broadcast(
                [
                  new MsgExecuteContract({
                    sender: secretAddress,
                    contractAddress: selectedToken.address,
                    codeHash: selectedToken.code_hash,
                    sentFunds: [
                      { denom: selectedToken.withdrawals[0].from_denom, amount },
                    ],
                    msg: { deposit: {} },
                  }),
                ],
                {
                  gasLimit: 150_000,
                  gasPriceInFeeDenom: 0.25,
                  feeDenom: "uscrt",
                }
              );

              if (tx.code === 0) {
                setAmountToWrap("");
                toast.update(toastId, {
                  render: `Wrapped ${selectedToken.name} successfully`,
                  type: "success",
                  isLoading: false,
                  closeOnClick: true,
                });
                console.log(`Wrapped successfully`);
              } else {
                toast.update(toastId, {
                  render: `Wrapping of ${selectedToken.name} failed: ${tx.rawLog}`,
                  type: "error",
                  isLoading: false,
                  closeOnClick: true,
                });
                console.error(`Tx failed: ${tx.rawLog}`);
              }
            } else {
              const tx = await secretjs.tx.broadcast(
                [
                  new MsgExecuteContract({
                    sender: secretAddress,
                    contractAddress: selectedToken.address,
                    codeHash: selectedToken.code_hash,
                    sentFunds: [],
                    msg: {
                      redeem: {
                        amount,
                        denom:
                          selectedToken.name === "SCRT"
                            ? undefined
                            : selectedToken.withdrawals[0].from_denom,
                      },
                    },
                  }),
                ],
                {
                  gasLimit: 150_000,
                  gasPriceInFeeDenom: 0.25,
                  feeDenom: "uscrt",
                  feeGranter: useFeegrant ? faucetAddress : "",
                }
              );
              if (tx.code === 0) {
                setAmountToWrap("");
                toast.update(toastId, {
                  render: `Unwrapped ${selectedToken.name} successfully`,
                  type: "success",
                  isLoading: false,
                  closeOnClick: true,
                });
                console.log(`Unwrapped successfully`);
              } else {
                toast.update(toastId, {
                  render: `Unwrapping of ${selectedToken.name} failed: ${tx.rawLog}`,
                  type: "error",
                  isLoading: false,
                  closeOnClick: true,
                });
                console.error(`Tx failed: ${tx.rawLog}`);
              }
            }
          } finally {
            setLoadingWrapOrUnwrap(false);
            try {
              setLoadingCoinBalance(true);
              await sleep(1000); // sometimes query nodes lag
              await updateCoinBalance();
            } finally {
              setLoadingCoinBalance(false);
            }
          }
        }
      }>
        {/* loading animation */}
        {loadingWrapOrUnwrap ? (<svg className="inline-block animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>) : ''} <FontAwesomeIcon icon={faArrowRightArrowLeft} className="mr-2"/>
        
        {/* text for wrapping with value */}
        {(wrappingMode === WrappingMode.Wrap && amountToWrap) && (<>
          Wrap <span className="text-xs font-normal mx-1">{amountToWrap} {nativeCurrency}</span> into <span className="text-xs font-normal mx-1">{amountToWrap} {wrappedCurrency}</span>
        </>)}

        {/* text for unwrapping with value */}
        {(wrappingMode === WrappingMode.Unwrap && amountToWrap) && (<>
          Unwrap <span className="text-xs font-normal mx-1">{amountToWrap} {wrappedCurrency}</span> into <span className="text-xs font-normal mx-1">{amountToWrap} {nativeCurrency}</span>
        </>)}

        {/* general text without value */}
        {(!amountToWrap) && (<>{wrappingMode === WrappingMode.Wrap ? "Wrap" : "Unwrap"}</>)}
      </button>
    )
  }

  const updateCoinBalance = async () => {
    try {
      const {
        balance: { amount },
      } = await secretjs.query.bank.balance(
        {
          address: secretAddress,
          denom: selectedToken.withdrawals[0]?.from_denom,
        },
      );
      setTokenNativeBalance(amount);
    } catch (e) {
      console.error(`Error while trying to query ${selectedToken.name}:`, e);
    }
  }

  useEffect(() => {
    if (!secretjs || !secretAddress) {
      return;
    }

    const interval = setInterval(handlePickerChoice, 10_000, selectedToken);

    (async () => {
      handlePickerChoice(selectedToken);
    })();

    return () => {
      clearInterval(interval);
    };
  }, [secretAddress, secretjs, selectedToken]);

  useEffect(() => {
    fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${selectedToken.coingecko_id}&vs_currencies=USD`)
      .then((resp) => resp.json())
      .then((result: { [coingecko_id: string]: { usd: number } }) => {
        setPrice(result[selectedToken.coingecko_id].usd);
      });
  }, []);
  
  return (
    <>
      <div className="w-full max-w-xl mx-auto px-4">
        <div className="border rounded-lg p-12 pb-7 border-zinc-700 w-full bg-zinc-800 text-zinc-200">

          <Header title="Secret Wrap" text="Wrapping coins as secret tokens immediately supercharges them with private balances and private transfers."/>

          {/* Form */}
          <NativeTokenInputComponent/>
          <WrappingModeSwitchInputComponent wrappingMode={wrappingMode} disabled={!secretAddress}/>
          <WrappedTokenInputComponent/>
          <SubmitButton disabled={!selectedToken.address || !setAmountToWrap} amountToWrap={amountToWrap} nativeCurrency={selectedToken.name} wrappedAmount={amountToWrap} wrappedCurrency={"s" + selectedToken.name} wrappingMode={wrappingMode}/>

        </div>
      </div>

      <Breakpoint medium up>
        <ToastContainer
          position="bottom-left"
          autoClose={5000}
          hideProgressBar
          newestOnTop={true}
          closeOnClick={false}
          rtl={false}
          pauseOnFocusLoss
          draggable={false}
          pauseOnHover={true}
          theme="dark"
        />
      </Breakpoint>
      <Breakpoint small down>
        <ToastContainer 
          position={"bottom-left"}
          autoClose={false}
          hideProgressBar={true}
          closeOnClick={true}
          draggable={false}
          theme={"dark"}
          transition={Flip}
        />
      </Breakpoint>
    </>
  )
}