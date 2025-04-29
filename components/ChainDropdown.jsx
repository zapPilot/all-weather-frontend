import { Button, Dropdown } from "antd";
import { DownOutlined } from "@ant-design/icons";
import Image from "next/image";
import { normalizeChainName } from "../utils/chainHelper";
import { base, arbitrum, optimism } from "thirdweb/chains";
import { memo, useMemo, useCallback } from "react";

// Static chain configuration
const CHAINS = [
  { key: "1", chain: arbitrum, name: "arbitrum" },
  { key: "2", chain: base, name: "base" },
  { key: "3", chain: optimism, name: "optimism" },
];

// Memoized chain item component with optimized image loading
const ChainItem = memo(({ chain, name, switchChain }) => {
  const handleClick = useCallback(() => {
    switchChain(chain);
  }, [chain, switchChain]);

  return (
    <Button type="link" onClick={handleClick}>
      <Image
        src={`/chainPicturesWebp/${name}.webp`}
        alt={name}
        height={16}
        width={16}
        className="rounded-full"
        loading="lazy"
        quality={50}
        unoptimized={true}
      />
    </Button>
  );
});

ChainItem.displayName = "ChainItem";

// Memoized dropdown trigger component with optimized image loading
const DropdownTrigger = memo(({ chainName }) => (
  <div className="flex items-center gap-3 p-2 rounded-md bg-white/90 text-xs cursor-pointer">
    <div className="flex items-center gap-2 p-1">
      <Image
        src={`/chainPicturesWebp/${chainName}.webp`}
        alt={chainName}
        height={16}
        width={16}
        className="rounded-full"
        loading="lazy"
        quality={50}
        unoptimized={true}
      />
      <span className="font-mono inline">{chainName}</span>
      <DownOutlined className="size-5" />
    </div>
  </div>
));

DropdownTrigger.displayName = "DropdownTrigger";

const ChainDropdown = memo(({ chainId, switchChain }) => {
  // Memoize the switch items to prevent unnecessary recreations
  const switchItems = useMemo(
    () =>
      CHAINS.map(({ key, chain, name }) => ({
        key,
        label: (
          <ChainItem chain={chain} name={name} switchChain={switchChain} />
        ),
      })),
    [switchChain],
  );

  // Memoize the chain name calculation
  const chainName = useMemo(
    () => (chainId?.name ? normalizeChainName(chainId.name) : "arbitrum"),
    [chainId?.name],
  );

  // Memoize the menu configuration
  const menuConfig = useMemo(
    () => ({
      items: switchItems,
    }),
    [switchItems],
  );

  return (
    <Dropdown menu={menuConfig} trigger="click">
      <DropdownTrigger chainName={chainName} />
    </Dropdown>
  );
});

ChainDropdown.displayName = "ChainDropdown";

export default ChainDropdown;
