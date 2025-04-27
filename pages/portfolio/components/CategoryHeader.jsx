import Image from "next/image";
import { categoryMapping } from "../PortfolioComposition";

const CategoryHeader = ({ category }) => (
  <div className="mt-8 first:mt-0 mb-4">
    <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2 flex items-center">
      <Image
        src={`/tokenPictures/${categoryMapping[category]?.toLowerCase()}.webp`}
        alt={categoryMapping[category]}
        height={24}
        width={24}
        className="mr-2"
      />
      <span className="text-gray-400">{categoryMapping[category]}</span>
    </h3>
  </div>
);

export default CategoryHeader;
