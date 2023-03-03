import { AxelarQueryAPI, Environment } from "@axelar-network/axelarjs-sdk";
import { AppCurrency } from "@keplr-wallet/types";
import { CoinPretty } from "@keplr-wallet/unit";
import debounce from "debounce";
import { useCallback, useEffect, useMemo, useState } from "react";

/** Fetches a new Transfer fee quote when either chain, the amount, or the currency changes.
 *  `amountMinDenom` is from user input, assumes `=== ""` for no input, and therefore no query.
 *  @sourceChain: The chain the user is sending from.
 *  @destChain: The chain the user is sending to.
 *  @axelarTokenMinDenom: The min denom of the token being trasferred, accepted by Axelar APIs.
 *  @amount: The amount of the token being transferred, in min denom (integer).
 *  @memoedCurrency: The memoied ref of currency of the token being transferred, used to create a CoinPretty for transfer fee.
 *  @environment: The Axelar environment to query.
 *  @inputDebounceMs: The amount of time to wait after the user stops typing before querying.
 */
export function useTransferFeeQuery(
  sourceChain: string,
  destChain: string,
  axelarTokenMinDenom: string,
  amount: string,
  memoedCurrency: AppCurrency,
  environment = Environment.MAINNET,
  inputDebounceMs = 2000
): { transferFee?: CoinPretty; isLoading: boolean } {
  const [transferFee, setTransferFee] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const api = useMemo(() => new AxelarQueryAPI({ environment }), [environment]);

  const queryTransferFee = useCallback(
    (amountMinDenom: string) => {
      if (amountMinDenom === "") {
        return;
      }

      const amount = Number(
        new CoinPretty(memoedCurrency, amountMinDenom).toCoin().amount
      );
      if (!isNaN(amount)) {
        setIsLoading(true);
        api
          .getTransferFee(sourceChain, destChain, axelarTokenMinDenom, amount)
          .then((resp) => {
            if (resp.fee && resp.fee.amount !== transferFee) {
              setTransferFee(resp.fee.amount);
            }
          })
          .catch((e) => {
            console.error("useTransferFeeQuery", e);
          })
          .finally(() => setIsLoading(false));
      } else {
        throw new Error("Requested fee amount is not a number.");
      }
    },
    [api, sourceChain, destChain, axelarTokenMinDenom, memoedCurrency]
  );

  const debouncedTransferFeeQuery = useCallback(
    debounce(queryTransferFee, inputDebounceMs),
    [queryTransferFee, inputDebounceMs]
  );

  useEffect(() => {
    debouncedTransferFeeQuery(amount);
  }, [debouncedTransferFeeQuery, amount]);

  const transferFeeRet = useMemo(
    () =>
      transferFee !== null
        ? new CoinPretty(memoedCurrency, transferFee)
        : undefined,
    [memoedCurrency, transferFee]
  );

  return {
    transferFee: transferFeeRet,
    isLoading,
  };
}
