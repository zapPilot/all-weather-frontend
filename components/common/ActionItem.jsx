import React from "react";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import CompletionActions from "../../components/CompletionActions";

const actionNameMap = {
  zapIn: "Deposit",
  zapOut: "Withdraw",
  crossChainRebalance: "Cross-Chain Rebalance",
  localRebalance: "Rebalance",
};

const ChainIndicator = ({ chain, index, isActive, isCurrentChain, theme, actionText }) => {
  const styles = {
    text: isActive
      ? "text-green-500"
      : isCurrentChain
      ? theme === "dark"
        ? "text-white"
        : "text-gray-900"
      : "text-gray-500",
    border: isActive
      ? "border-green-500"
      : isCurrentChain
      ? theme === "dark"
        ? "border-white"
        : "border-gray-900"
      : "border-gray-500",
  };

  const showPulsingDot = isCurrentChain && !isActive;
  console.log("chain", chain, index, isActive, isCurrentChain, theme, actionText);
  return (
    <div className={`flex flex-col items-center mx-2 ${styles.text}`}>
      <div className={`w-10 h-10 border-2 rounded-full flex items-center justify-center relative ${styles.border}`}>
        {showPulsingDot && (
          <div className="absolute -top-2">
            <span className="relative flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex size-3 rounded-full bg-red-500"></span>
            </span>
          </div>
        )}
        {index + 1}
      </div>
      <p>
        {actionText} on {chain}
      </p>
    </div>
  );
};

const CompletionStatus = ({ allActionsCompleted, account }) => {
  if (!allActionsCompleted) return null;

  return (
    <div className="text-green-500 text-center mb-2">
      <div className="flex items-center justify-center gap-2 mb-2">
        <CheckCircleIcon className="w-6 h-6" />
        <p>You have completed all actions.</p>
      </div>
      <CompletionActions account={account} />
    </div>
  );
};

const ActionItem = React.forwardRef((props, ref) => {
  const {
    actionName,
    availableAssetChains,
    currentChain,
    chainStatus,
    theme,
    isStarted,
    account,
    errorMsg,
  } = props;

  console.log("actionName", actionName,"theme actionitem", theme);
  const actionIsArray = Array.isArray(actionName);
  
  // Store the locked order once started
  const lockedOrderRef = React.useRef(null);
  
  // Lock the order when isStarted becomes true, using the current order
  React.useEffect(() => {
    if (isStarted && !lockedOrderRef.current) {
      // Get the current order before any chain switching
      const currentOrder = [...availableAssetChains].sort((a, b) => {
        // First priority: finished chains
        const aFinished = chainStatus[a];
        const bFinished = chainStatus[b];
        
        if (aFinished && !bFinished) return -1;
        if (!aFinished && bFinished) return 1;
        
        // Second priority: current chain
        if (a === currentChain) return -1;
        if (b === currentChain) return 1;
        
        // Third priority: shorter chain name first
        const lengthDiff = a.length - b.length;
        if (lengthDiff !== 0) return lengthDiff;
        
        // Fourth priority: alphabetic order
        return a.localeCompare(b);
      });
      
      console.log("locking order before chain switch", currentOrder);
      lockedOrderRef.current = currentOrder;
    }
  }, [isStarted, availableAssetChains, currentChain, chainStatus]);

  // Get the next chain from the locked order
  const getNextChain = React.useCallback(() => {
    if (!lockedOrderRef.current) return null;
    
    // Filter out finished chains and get the first unfinished one
    const unfinishedChains = lockedOrderRef.current.filter(chain => 
      availableAssetChains.includes(chain) && !chainStatus[chain]
    );
    
    return unfinishedChains[0] || null;
  }, [availableAssetChains, chainStatus]);

  // Expose getNextChain through ref
  React.useImperativeHandle(ref, () => ({
    getNextChain
  }));

  const displayChains = React.useMemo(() => {
    if (!availableAssetChains) return [];
    
    // If we have a locked order, use it
    if (lockedOrderRef.current) {
      const filteredChains = lockedOrderRef.current.filter(chain => 
        availableAssetChains.includes(chain)
      );
      console.log("using locked order", filteredChains);
      return filteredChains;
    }
    
    // Otherwise, sort based on current chain and status
    const sortedChains = [...availableAssetChains].sort((a, b) => {
      // First priority: finished chains
      const aFinished = chainStatus[a];
      const bFinished = chainStatus[b];
      
      if (aFinished && !bFinished) return -1;
      if (!aFinished && bFinished) return 1;
      
      // Second priority: current chain
      if (a === currentChain) return -1;
      if (b === currentChain) return 1;
      
      // Third priority: shorter chain name first
      const lengthDiff = a.length - b.length;
      if (lengthDiff !== 0) return lengthDiff;
      
      // Fourth priority: alphabetic order
      return a.localeCompare(b);
    });
    
    console.log("sorted chains", sortedChains);
    return sortedChains;
  }, [availableAssetChains, currentChain, chainStatus, isStarted]);

  const allActionsCompleted = availableAssetChains?.length > 0
    ? availableAssetChains.every((chain) => chainStatus[chain])
    : false;

  const renderChainIndicator = (chain, index) => {
    const actionText = actionIsArray
      ? actionNameMap[actionName[index]]
      : actionNameMap[actionName];
    console.log("rendering chain", chain, index, actionText, "currentChain", currentChain);
    return (
      <ChainIndicator
        key={chain}
        chain={chain}
        index={index}
        isActive={chainStatus[chain]}
        isCurrentChain={currentChain === chain}
        theme={theme}
        actionText={actionText}
      />
    );
  };

  if (!availableAssetChains?.length) {
    return (
      <div className="text-gray-500 text-center mb-2">
        <p>No actions available at this time.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-center text-base font-semibold">
        {!allActionsCompleted && displayChains?.map(renderChainIndicator)}
      </div>
      <div className="mt-4">
        <CompletionStatus 
          allActionsCompleted={allActionsCompleted} 
          account={account} 
        />
      </div>
      {errorMsg && <div className="mt-4 text-red-500">{errorMsg}</div>}
    </>
  );
});

export default ActionItem;
export { actionNameMap };
