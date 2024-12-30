import type { NextPage } from "next";
import Head from "next/head";
import { CreateView } from "../views";

const Create: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>Create Token - $TBITS</title>
        <meta
          name="description"
          content="Create your own token on solana"
        />
      </Head>
      <CreateView />
    </div>
  );
};

export default Create;
