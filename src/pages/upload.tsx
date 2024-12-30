import type { NextPage } from "next";
import Head from "next/head";
import { UploadView } from "../views";

const Upload: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>Upload file to arweave - $TBITS</title>
        <meta
          name="description"
          content="Upload file to arweave"
        />
      </Head>
      <UploadView />
    </div>
  );
};

export default Upload;
