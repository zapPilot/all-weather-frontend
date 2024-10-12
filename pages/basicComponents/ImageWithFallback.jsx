import React, { useState } from "react";
import Image from "next/image";

const ImageWithFallback = ({ token, height, width, key, className }) => {
  const [imgSrc, setImgSrc] = useState(
    `/tokenPictures/${
      token
        ?.replace("lp ", "")
        ?.replace("pt ", "")
        ?.replace(/[()]/g, "")
        .split(" ")[0]
    }.webp`,
  );
  return (
    <Image
      src={imgSrc}
      alt={token}
      height={height}
      width={width}
      key={key}
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
          if (token.includes(commonToken)) {
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
