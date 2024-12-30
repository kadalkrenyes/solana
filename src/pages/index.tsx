import type { NextPage } from "next";
import Head from "next/head";
import { HomeView } from "../views";

const Home: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>Launch Tbits</title>
        <meta
          name="description"
          content="Launch your tokens on pump.fun with style & predetermined custom CAs."
        />
      </Head>
      <HomeView />
    </div>
  );
};

export default Home;
