import { memo, useMemo } from "react";
import Image from "next/image";
import { categoryMapping } from "../PortfolioComposition";
import { ASSET_CONFIG } from "../../../config/assetConfig";
const CategoryHeader = memo(({ category }) => {
  const categoryName = useMemo(() => categoryMapping[category], [category]);
  const imageSrc = useMemo(
    () =>
      ASSET_CONFIG.getAssetPath(
        `/tokenPictures/${categoryName?.toLowerCase()}.webp`,
      ),
    [categoryName],
  );

  return (
    <div className="mt-8 first:mt-0 mb-4">
      <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2 flex items-center">
        <Image
          src={imageSrc}
          alt={categoryName}
          height={24}
          width={24}
          className="mr-2"
          loading="lazy"
          quality={50}
          unoptimized={true}
        />
        <span className="text-gray-400">{categoryName}</span>
      </h3>
    </div>
  );
});

CategoryHeader.displayName = "CategoryHeader";

export default CategoryHeader;
