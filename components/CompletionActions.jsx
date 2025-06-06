import Image from "next/image";
import EmailSubscription from "../pages/emailsubscription";
import { ASSET_CONFIG } from "../config/assetConfig";
export default function CompletionActions({ account }) {
  return (
    <div className="flex flex-col items-center w-full gap-4">
      <EmailSubscription />
      <a
        href={`https://debank.com/profile/${account?.address}`}
        target="_blank"
        className="w-full max-w-md flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl bg-white/25 shadow-md hover:bg-white/25 transition-colors text-gray-200 border border-gray-100/50"
      >
        <Image
          src={ASSET_CONFIG.getAssetPath("/projectPictures/debank.webp")}
          alt="debank"
          height={25}
          width={25}
          loading="lazy"
          quality={50}
          unoptimized={true}
        />
        <span className="text-gray-400 font-medium">
          Check your portfolio on Debank
        </span>
      </a>
    </div>
  );
}
