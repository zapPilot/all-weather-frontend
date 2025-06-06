import React, { useState } from "react";
import Image from "next/image";
import { ASSET_CONFIG } from "../../config/assetConfig";
const ImageWithFallback = ({ token, height, width, domKey, className }) => {
  const [imgSrc, setImgSrc] = useState(() => {
    if (!token)
      return ASSET_CONFIG.getAssetPath("/tokenPictures/placeholder.webp");

    const cleanedToken = token
      .trim()
      .toLowerCase()
      .replace("lp ", "")
      .replace("pt ", "")
      .replace(/[()]/g, "")
      .split(" ")[0];
    return ASSET_CONFIG.getAssetPath(`/tokenPictures/${cleanedToken}.webp`);
  });
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
            setImgSrc(
              ASSET_CONFIG.getAssetPath(`/tokenPictures/${commonToken}.webp`),
            );
            return;
          }
        }
        setImgSrc(ASSET_CONFIG.getAssetPath("/tokenPictures/placeholder.webp"));
      }}
      loading="lazy"
      quality={50}
      unoptimized={true}
    />
  );
};

export default ImageWithFallback;
