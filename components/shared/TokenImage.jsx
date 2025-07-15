import React from "react";
import Image from "next/image";
import ImageWithFallback from "../../pages/basicComponents/ImageWithFallback";
import { getTokenSymbol } from "../../utils/tokenUtils";

/**
 * TokenImage component - displays token logo with fallback
 * @param {Object} props
 * @param {Object} props.token - Token object with logo_url, symbol, and optimized_symbol
 * @param {number} props.size - Image size in pixels (default: 20)
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} TokenImage component
 */
const TokenImage = ({ token, size = 20, className = "" }) => {
  const symbol = getTokenSymbol(token);

  if (token.logo_url) {
    return (
      <Image
        src={token.logo_url}
        alt={symbol}
        width={size}
        height={size}
        className={`rounded-full ${className}`}
      />
    );
  }

  return (
    <ImageWithFallback
      token={symbol}
      height={size}
      width={size}
      className={className}
    />
  );
};

export default TokenImage;
