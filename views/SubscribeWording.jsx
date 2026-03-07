import Link from "next/link";
export default function SubscribeWording() {
  return (
    <>
      <h3 className="text-base font-semibold leading-5">
        Deposit funds into any vault to unlock premium features
      </h3>
      <div className="my-5" role="subscribe_link">
        <Link
          href="/"
          className="px-2 py-1 rounded ring-1 ring-inset ring-emerald-400 text-sm font-semibold leading-6 text-emerald-400 "
        >
          Zap In<span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </>
  );
}
