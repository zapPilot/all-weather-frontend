import Link from "next/link";
export default function SubscribeWording() {
  return (
    <>
      <h3 className="text-base font-semibold leading-5">
        Please subscribe to unlock advanced features!
      </h3>
      <div className="my-5" role="subscribe_link">
        <Link
          href="/subscription"
          className="px-2 py-1 rounded ring-1 ring-inset ring-emerald-400 text-sm font-semibold leading-6 text-emerald-400 "
        >
          Subscribe <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </>
  );
}
