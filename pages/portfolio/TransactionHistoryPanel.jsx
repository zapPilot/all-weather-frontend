import TransactionHistory from "../indexes/transactionHistory";

export default function TransactionHistoryPanel({
  setPrincipalBalance,
  tokenPricesMappingTable,
}) {
  return (
    <div className="lg:col-start-3 h-full border border-white/50">
      <div className="h-96 overflow-y-scroll shadow-sm p-6">
        <h2 className="text-sm font-semibold leading-6 text-white">History</h2>
        <ul role="list" className="mt-6 space-y-6">
          <TransactionHistory
            setPrincipalBalance={setPrincipalBalance}
            tokenPricesMappingTable={tokenPricesMappingTable}
          />
        </ul>
      </div>
    </div>
  );
}
