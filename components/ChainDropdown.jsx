import { Button, Dropdown } from "antd";
import Image from "next/image";
import { normalizeChainName } from "../utils/chainHelper";
import { base, arbitrum, optimism } from "thirdweb/chains";
import { ASSET_CONFIG } from "../config/assetConfig";
const createSwitchItems = (switchChain) => [
  {
    key: "1",
    label: (
      <Button type="link" onClick={() => switchChain(arbitrum)}>
        <Image
          src={ASSET_CONFIG.getAssetPath(`/chainPicturesWebp/arbitrum.webp`)}
          alt="arbitrum"
          height={16}
          width={16}
          className="rounded-full"
        />
      </Button>
    ),
  },
  {
    key: "2",
    label: (
      <Button type="link" onClick={() => switchChain(base)}>
        <Image
          src={ASSET_CONFIG.getAssetPath(`/chainPicturesWebp/base.webp`)}
          alt="base"
          height={16}
          width={16}
          className="rounded-full"
        />
      </Button>
    ),
  },
  {
    key: "3",
    label: (
      <Button type="link" onClick={() => switchChain(optimism)}>
        <Image
          src={ASSET_CONFIG.getAssetPath(`/chainPicturesWebp/optimism.webp`)}
          alt="optimism"
          height={16}
          width={16}
          className="rounded-full"
        />
      </Button>
    ),
  },
];

const ChainDropdown = ({ chainId, switchChain }) => {
  const switchItems = createSwitchItems(switchChain);
  const chainName = chainId?.name
    ? normalizeChainName(chainId.name)
    : "arbitrum";

  return (
    <Dropdown
      menu={{
        items: switchItems,
      }}
      trigger="click"
    >
      <div className="flex items-center gap-3 p-2 rounded-md bg-white/90 text-xs cursor-pointer">
        <div className="flex items-center gap-2 p-1">
          <Image
            src={ASSET_CONFIG.getAssetPath(
              `/chainPicturesWebp/${chainName}.webp`,
            )}
            alt={chainName}
            height={16}
            width={16}
            className="rounded-full"
          />
          <span className="font-mono inline">{chainName}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-5"
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    </Dropdown>
  );
};

export default ChainDropdown;
