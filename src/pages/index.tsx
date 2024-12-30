import type { NextPage } from "next";
import Head from "next/head";
import { HomeView } from "../views";

const Home: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>$TBITS</title>
        <meta
          name="description"
          content="Tools to help people in the Solana ecosystem."
        />
      </Head>
      <HomeView />
    </div>
  );
};

export default Home;
