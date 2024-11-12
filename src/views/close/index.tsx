import { FC, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ComputeBudgetProgram, Connection, PublicKey, Transaction } from "@solana/web3.js";
import { useNetworkConfiguration } from "contexts/NetworkConfigurationProvider";
import { getConnection } from "utils/getConnection";
import { getAssetsInfos } from "utils/getAssetsInfos";
import { Loader } from "components/Loader";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, createCloseAccountInstruction } from "@solana/spl-token";
import { getEmptyTokenAccounts } from "utils/getEmptyAccounts";
import { Card } from "components/ui/card";
import { ADD_COMPUTE_UNIT_LIMIT_CU, ADD_COMPUTE_UNIT_PRICE_CU, CLOSE_ACCOUNT_CU } from "utils/CUPerInstruction";
import { AUTHORITY } from "config";
import { notify } from "utils/notifications";
import { getTotalLamports } from "utils/getTotalLamports";

export const CloseView: FC = ({ }) => {
  const wallet = useWallet();

  const networkConfig = useNetworkConfiguration();
  const networkSelected = networkConfig.networkConfiguration;

  const [connection, setConnection] = useState<Connection>();
  const [emptyAccounts, setEmptyAccounts] = useState<{ account: PublicKey, program: PublicKey, image: string, name: string, mint: string, lamports: number }[]>([]);
  const [assetsSelected, setAssetSelected] = useState<{ account: PublicKey, program: PublicKey, image: string, name: string, mint: string, lamports: number }[]>([]);
  const [isClosing, setIsClosing] = useState(false);
  const [isFetched, setIsFetched] = useState(false);
  const [totalLamports, setTotalLamports] = useState<number>();

  const nbPerTx = 20;

  useEffect(() => {
    const connection = getConnection(networkSelected);
    getEmptyAccounts();
    setConnection(connection);
  }, [networkConfig, wallet]);


  const getEmptyAccounts = async () => {
    if (wallet.publicKey) {
      setIsFetched(false);
      const connection = getConnection(networkSelected);
      const emptyTokenAccountsRegular = await getEmptyTokenAccounts(
        wallet.publicKey,
        connection,
        TOKEN_PROGRAM_ID,
      );
      const emptyTokenAccounts2022 = await getEmptyTokenAccounts(
        wallet.publicKey,
        connection,
        TOKEN_2022_PROGRAM_ID,
      );

      const emptyTokenAccounts = emptyTokenAccountsRegular.concat(
        emptyTokenAccounts2022,
      );

      const assetsWithInfos = await getAssetsInfos(emptyTokenAccounts, networkSelected);
      console.log(assetsWithInfos);
      const totalLamports = getTotalLamports(emptyTokenAccounts);
      setTotalLamports(totalLamports);
      setEmptyAccounts(assetsWithInfos);
      setIsFetched(true);
    }
  }

  function SelectButton(props: { assetsWithInfos: { account: PublicKey, program: PublicKey, image: string, name: string, mint: string, lamports: number } }) {
    const [isSelected, setIsSelected] = useState(false);

    useEffect(() => {
      if (assetsSelected.includes(props.assetsWithInfos)) {
        setIsSelected(true);
      } else {
        setIsSelected(false);
      }
    });
    return (
      <div>
        {!isSelected ? (
          <button
            className="font-bold py-1 px-2 bg-[#312d29] border border-[#c8ab6e] rounded-xl"
            onClick={() => {
              setIsSelected(true);
              assetsSelected.push(props.assetsWithInfos);
            }}
          >
            Select
          </button>
        ) : (
          <button
            className="font-bold py-1 px-2 bg-[#095228] border border-[#c8ab6e] rounded-xl"
            onClick={() => {
              setIsSelected(false);
              assetsSelected.splice(assetsSelected.indexOf(props.assetsWithInfos), 1);
            }}
          >
            Unselect
          </button>
        )}
      </div>
    );
  }

  const closeAccounts = async (assets: { account: PublicKey, program: PublicKey, image: string, name: string, mint: string, lamports: number }[]) => {

    if (assets.length == 0) {
      notify({ type: 'error', message: `Please choose at least one token account to close first!` });
    }
    else {
      setIsClosing(true);
      try {
        let nbTx: number;
        if (assets.length % nbPerTx == 0) {
          nbTx = assets.length / nbPerTx;
        } else {
          nbTx = Math.floor(assets.length / nbPerTx) + 1;
        }

        for (let i = 0; i < nbTx; i++) {
          let bornSup: number;

          if (i == nbTx - 1) {
            bornSup = assets.length;
          } else {
            bornSup = nbPerTx * (i + 1);
          }

          let Tx = new Transaction().add(
            ComputeBudgetProgram.setComputeUnitPrice({
              microLamports: 1000,
            }),
            ComputeBudgetProgram.setComputeUnitLimit({
              units:
                bornSup * CLOSE_ACCOUNT_CU +
                ADD_COMPUTE_UNIT_PRICE_CU +
                ADD_COMPUTE_UNIT_LIMIT_CU
            }),);

          const NON_MEMO_IX_INDEX = 1;

          // inject an authority key to track this transaction on chain
          Tx.instructions[NON_MEMO_IX_INDEX].keys.push({
            pubkey: AUTHORITY,
            isWritable: false,
            isSigner: false,
          });

          for (let j = nbPerTx * i; j < bornSup; j++) {
            Tx.add(
              createCloseAccountInstruction(
                assets[j].account,
                wallet.publicKey,
                wallet.publicKey,
                [],
                assets[j].program,
              ),
            );
          }
          notify({ type: 'information', message: `Please confirm Tx: ${i + 1}/${nbTx}` });
          const signature = await wallet.sendTransaction(Tx, connection, { preflightCommitment: "confirmed" });
          let confirmed = false;
          let timeout = 0;
          while (!confirmed && timeout < 10000) {
            let status = await connection.getSignatureStatuses([signature]);
            if (status.value[0]?.confirmationStatus == "confirmed") {
              notify({ type: 'success', message: `Success!`, txid: signature });
              confirmed = true;
            }
            else {
              timeout += 500;
              await new Promise(r => setTimeout(r, 500));
            }
          }

          if (timeout == 1000) {
            notify({ type: 'error', message: `Tx timed-out. Try again` });
          }
        }
        await getEmptyAccounts();
        setIsClosing(false);
        setAssetSelected([]);
      }
      catch (error) {
        setIsClosing(false);
        const err = (error as any)?.message;
        notify({ type: 'error', message: err });
        setAssetSelected([]);
      }
    }
  }

  return (
    <div className="md:hero mx-auto w-full p-4">
      <div className="md:hero-content flex flex-col">
        <div className="mt-6 ">
          <h1 className="text-center text-5xl font-bold mb-8">
            Close token accounts and earn $SOL
          </h1>

          <div className="flex justify-center mb-4">
            {!isClosing ?
              <div className="flex justify-center">
                <button onClick={() => closeAccounts(emptyAccounts)} className="mx-2 font-bold text-lg py-1 px-2 bg-[#312d29] border border-[#c8ab6e] rounded-xl">Close all accounts</button>
                <button onClick={() => closeAccounts(assetsSelected)} className="mx-2 font-bold text-lg py-1 px-2 bg-[#312d29] border border-[#c8ab6e] rounded-xl">Close accounts selected</button>
              </div>
              :
              <button className="mx-2 font-bold text-lg py-1 px-2 bg-[#312d29] border border-[#c8ab6e] rounded-xl">
                <svg
                  role="status"
                  className="inline mr-3 w-4 h-4 text-white animate-spin"
                  viewBox="0 0 100 101"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                    fill="#E5E7EB"
                  />
                  <path
                    d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                    fill="currentColor"
                  />
                </svg>
                Closing...
              </button>
            }
          </div>

          {wallet.publicKey && isFetched &&
            <div className="flex items-center p-4 mb-4 font-bold text-lg text-blue-800 rounded-lg bg-blue-50 dark:bg-gray-800 dark:text-blue-400" role="alert">
              <svg className="flex-shrink-0 inline w-4 h-4 me-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
              </svg>
              <span className="sr-only">Info</span>
              <div className="ml-2">
                You can get up to {totalLamports} SOL!
              </div>
            </div>}
          {wallet.publicKey && isFetched && emptyAccounts.length == 0 ?
            <div className="text-center">No account to close</div> :
            <div className="grid grid-cols-4 gap-4">
              {emptyAccounts.map((account, key) => {
                return (
                  <Card key={key} className="flex justify-center">
                    <div>
                      <img src={account.image} className="w-[160px] h-[160px] mt-2"></img>
                      <div className="text-center mt-2 text-xs">
                        {account.name != undefined ? account.name : "Unknown token"}
                      </div>
                      <div className="flex justify-center my-2">
                        <SelectButton assetsWithInfos={account} />
                        <a
                          target="_blank"
                          rel="noreferrer"
                          href={`https://solscan.io/token/${account.mint}`}
                          className="mx-2 font-bold py-1 px-2 bg-[#312d29] border border-[#c8ab6e] rounded-xl">
                          Info
                        </a>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          }

          {!wallet.publicKey && <div className="text-center font-bold mt-4 text-xl">Please, connect your wallet!</div>}

          {wallet.publicKey && !isFetched && <Loader text="Fetching assets..." />}
        </div>
      </div>
    </div>
  );
};