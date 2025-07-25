import { Spin } from "antd";
import Image from "next/image";
import { memo } from "react";
import ImageWithFallback from "../../pages/basicComponents/ImageWithFallback";

const TokenDisplay = ({ protocol }) => {
  return (
    <div className="flex flex-col gap-1 max-w-[200px]">
      <div className="relative flex items-center">
        {protocol.interface.symbolList.map((symbol, idx) => {
          const uniqueTokenKey = `${protocol.interface.uniqueId()}-${protocol.interface.symbolList.join(
            "",
          )}-${symbol}-${idx}`;
          return (
            <ImageWithFallback
              key={uniqueTokenKey}
              className="me-1 rounded-full"
              domKey={uniqueTokenKey}
              token={symbol.replace("(bridged)", "")}
              height={20}
              width={20}
            />
          );
        })}
      </div>
      <p className="font-medium truncate text-xs text-gray-400 text-left">
        {protocol.interface.symbolList.join("-")}
      </p>
    </div>
  );
};

export const MemoizedTokenDisplay = memo(TokenDisplay);

const ProtocolInfo = ({ protocol }) => (
  <div className="ms-2 truncate relative">
    <div className="flex items-center gap-4">
      <div className="relative inline-flex items-center">
        <Image
          src={`/projectPictures/${protocol.interface.protocolName}.webp`}
          alt={protocol.interface.protocolName}
          height={35}
          width={35}
          className="rounded-full"
        />
        <div className="absolute -bottom-1 -right-1">
          <Image
            src={`/chainPicturesWebp/${protocol.interface.chain}.webp`}
            alt={protocol.interface.chain}
            height={20}
            width={20}
            className="rounded-full"
          />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-base font-medium text-white">
          {protocol.interface.protocolName}
        </span>
        <span className="text-sm text-gray-500">
          {protocol.interface.chain}
        </span>
      </div>
    </div>
  </div>
);

export const MemoizedProtocolInfo = memo(ProtocolInfo);

const APRDisplay = ({ apr }) => (
  <span>{isNaN(apr * 100) ? <Spin /> : `${(apr * 100 || 0).toFixed(2)}%`}</span>
);

export const MemoizedAPRDisplay = memo(APRDisplay);

// Keep original exports for backward compatibility
export { MemoizedTokenDisplay as TokenDisplay };
export { MemoizedProtocolInfo as ProtocolInfo };
export { MemoizedAPRDisplay as APRDisplay };
