import Vault from "../../lib/contracts/Venus/Vault.json" assert { type: "json" };
import BaseProtocol from "../BaseProtocol";
import { getContract, prepareContractCall } from "thirdweb";
import THIRDWEB_CLIENT from "../../utils/thirdweb";
import { CHAIN_ID_TO_CHAIN, PROVIDER, approve } from "../../utils/general";
import { ethers } from "ethers";

export class Hmx extends BaseProtocol {
    constructor(chain, chainId, symbolList, mode, customParams) {
        super(chain, chainId, symbolList, mode, customParams);

        this.protocolName = "hmx";
        this.protocolVersion = "0";
        this.assetDecimals = customParams.assetDecimals;
        this.percentagePrecision = 18;
        this.exchangeRatePrecision = 18;

        if (!customParams.assetAddress) {
            throw new Error("Asset address is required");
        }
        
        this.assetContract = getContract({
            client: THIRDWEB_CLIENT,
            address: customParams.assetAddress,
            chain: CHAIN_ID_TO_CHAIN[this.chainId],
            abi: Vault,
        });
        this.protocolContract = getContract({
            client: THIRDWEB_CLIENT,
            address: customParams.protocolAddress,
            chain: CHAIN_ID_TO_CHAIN[this.chainId],
            abi: Vault,
        });
        this.stakeFarmContract = getContract({
            client: THIRDWEB_CLIENT,
            address: customParams.protocolAddress,
            chain: CHAIN_ID_TO_CHAIN[this.chainId],
            abi: Vault,
        });
        this.assetContractInstance = new ethers.Contract(
            customParams.assetAddress,
            Vault,
            PROVIDER(this.chain),
        );
        this.stakeFarmContractInstance = new ethers.Contract(
            this.stakeFarmContract.address,
            Vault,
            PROVIDER(this.chain),
        );

        this.symbolOfBestTokenToZapInOut = customParams.symbolOfBestTokenToZapInOut;
        this.zapInOutTokenAddress = customParams.zapInOutTokenAddress;
        this._checkIfParamsAreSet();
    }

    rewards() {
        return [];
    }

    async pendingRewards(owner, tokenPricesMappingTable, updateProgress) {
        return {};
    }

    async customDeposit(
        owner,
        inputToken,
        bestTokenAddressToZapIn,
        amountToZapIn,
        bestTokenToZapInDecimal,
        tokenPricesMappingTable,
        slippage,
        updateProgress,
    ) {
        const approveTxn = approve(
            bestTokenAddressToZapIn,
            this.protocolContract.address,
            amountToZapIn,
            updateProgress,
            this.chainId,
        );
        const depositParams = {
            "_tokenIn": bestTokenAddressToZapIn,
            "_amountIn": amountToZapIn, // uint256
            "_minOut": 0, // uint256
            "_executionFee": 0, // uint256
            "_shouldWrap": false,
            "_isNotAutoStake": false
        }

        const depositTxn = prepareContractCall({
            contract: this.protocolContract,
            method: "createAddLiquidityOrder",
            params: [depositParams],
        });

        return [[approveTxn, depositTxn], 0];

    }

    async customClaim(owner, tokenPricesMappingTable, updateProgress) {
        return [[], {}];
    }

    async usdBalanceOf(owner, tokenPricesMappingTable) {
        try {
            const protocolContractInstance = new ethers.Contract(
                this.protocolContract.address,
                Vault,
                PROVIDER(this.chain),
            );
            const balance = await protocolContractInstance.balanceOf(owner);
            return balance.mul(tokenPricesMappingTable[this.symbolOfBestTokenToZapInOut].price);
        } catch (error) {
            console.error("Error in usdBalanceOf:", error);
            return 0;
        }
    }

    async assetUsdPrice(tokenPricesMappingTable) {  
        return 1;
    }

    async stakeBalanceOf(owner) {
        return 0;
    }

    _getTheBestTokenAddressToZapIn(inputToken, tokenAddress, InputTokenDecimals) {
        return [inputToken, this.zapInOutTokenAddress, this.assetDecimals];
    }

    _getTheBestTokenAddressToZapOut() {
        return [this.symbolOfBestTokenToZapInOut, this.zapInOutTokenAddress, this.assetDecimals];
    }

    async lockUpPeriod() {
        return 0;
    }

    async _stake(amount, updateProgress) {
        return [];
    }

    async _unstake(owner, percentage, updateProgress) {
        const percentageStr = percentage
            .toFixed(this.percentagePrecision)
            .replace(".", "");
        const percentageBN = ethers.BigNumber.from(percentageStr);
        
    }

    async customWithdrawAndClaim(
        owner,
        amount,
        slippage,
        tokenPricesMappingTable,
        updateProgress,
    ) {
        const [
            symbolOfBestTokenToZapInOut,
            bestTokenAddressToZapOut,
            assetDecimals,
        ] = this._getTheBestTokenAddressToZapOut();
        
        const withdrawTxn = prepareContractCall({
            contract: this.protocolContract,
            method: "withdraw",
            params: [amount],
        });
        
        const tradingLoss = 0;
        return [
            [withdrawTxn],
            symbolOfBestTokenToZapInOut,
            bestTokenAddressToZapOut,
            assetDecimals,
            amount,
            tradingLoss,
        ];
    }
}
