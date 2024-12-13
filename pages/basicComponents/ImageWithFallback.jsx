import React, { useState } from "react";
import Image from "next/image";

const ImageWithFallback = ({ token, height, width, domKey, className }) => {
  const [imgSrc, setImgSrc] = useState(
    `/tokenPictures/${token
      ?.replace("lp ", "")
      ?.replace("pt ", "")
      ?.replace(/[()]/g, "")
      ?.trim()}.webp`,
  );
  return (
    <Image
      src={imgSrc}
      alt={token}
      height={height}
      width={width}
      key={domKey}
      className={className}
      onError={() => {
        for (const commonToken of [
          "btc",
          "eth",
          "usdc",
          "usdt",
          "matic",
          "pendle",
          "sol",
          "dai",
        ]) {
          if (token.toLowerCase().includes(commonToken)) {
            setImgSrc(`/tokenPictures/${commonToken}.webp`);
            return;
          }
        }
        setImgSrc("/tokenPictures/placeholder.webp");
      }}
    />
  );
};

export default ImageWithFallback;
