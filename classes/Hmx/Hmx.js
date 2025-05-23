import Hlp from "../../lib/contracts/Hmx/Hlp.json" assert { type: "json" };
import Vault from "../../lib/contracts/Hmx/Vault.json" assert { type: "json" };
import StakeHlp from "../../lib/contracts/Hmx/StakeHlp.json" assert { type: "json" };
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
            abi: Hlp,
        });
        this.protocolContract = getContract({
            client: THIRDWEB_CLIENT,
            address: customParams.protocolAddress,
            chain: CHAIN_ID_TO_CHAIN[this.chainId],
            abi: Vault,
        });
        this.stakeFarmContract = getContract({
            client: THIRDWEB_CLIENT,
            address: customParams.stakeFarmAddress,
            chain: CHAIN_ID_TO_CHAIN[this.chainId],
            abi: StakeHlp,
        });

        this.symbolOfBestTokenToZapOut = customParams.symbolOfBestTokenToZapOut;
        this.bestTokenAddressToZapOut = customParams.bestTokenAddressToZapOut;
        this.decimalOfBestTokenToZapOut = customParams.decimalOfBestTokenToZapOut;
        this.bestTokenToZapInDecimal = customParams.bestTokenToZapInDecimal;
    }

    rewards() {
        return this.customParams.rewards;
    }

    async pendingRewards(owner, tokenPricesMappingTable, updateProgress) {
        return {};
    }

    async _calculateExecutionFee() {
        try {
            // Get min execution fee from contract
            const protocolContractInstance = new ethers.Contract(
                this.protocolContract.address,
                Vault,
                PROVIDER(this.chain),
            );
            const minExecutionOrderFee = await protocolContractInstance.minExecutionOrderFee();
            console.log("minExecutionOrderFee from contract:", minExecutionOrderFee.toString());
            
            // Validate the execution fee is within uint256 range
            const maxUint256 = ethers.BigNumber.from("2").pow(256).sub(1);
            if (minExecutionOrderFee.gt(maxUint256)) {
                console.error("Execution fee exceeds uint256 range");
                return "100000000000000";
            }
            
            return minExecutionOrderFee.toString();
        } catch (error) {
            console.error("Error calculating execution fee:", error);
            // Fallback to a safe default if contract call fails
            return "100000000000000";
        }
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
        const hlpPrice = await this._fetchHmxPrice();
        const inputTokenUsdValue =
            (tokenPricesMappingTable[inputToken] * amountToZapIn) /
            Math.pow(10, bestTokenToZapInDecimal);
        const estimatedHlpAmount = inputTokenUsdValue / hlpPrice;
        const estimatedHlpAmountBN = ethers.utils.parseUnits(estimatedHlpAmount.toString(), 18);
        const minHlpAmountBN = estimatedHlpAmountBN.mul(100 - slippage).div(100);
        const executionFeeStr = await this._calculateExecutionFee();
        const depositTxn = prepareContractCall({
            contract: this.protocolContract,
            method: "function createAddLiquidityOrder(address _tokenIn, uint256 _amountIn, uint256 _minOut, uint256 _executionFee, bool _shouldWrap, bool _isNotAutoStake)",
            params: [
                bestTokenAddressToZapIn,
                amountToZapIn,
                minHlpAmountBN.toString(),
                executionFeeStr,
                false,
                false
            ],
            value: executionFeeStr,
        });

        // For debugging
        console.log("Params:", [
            bestTokenAddressToZapIn,
            amountToZapIn,
            minHlpAmountBN.toString(),
            executionFeeStr,
            false,
            false
        ]);

        return [[approveTxn, depositTxn], 0];
    }

    async customClaim(owner, tokenPricesMappingTable, updateProgress) {
        return [[], {}];
    }

    async usdBalanceOf(owner, tokenPricesMappingTable) {
        const [hlpBalance, hlpPrice] = await Promise.all([
            this.stakeBalanceOf(owner, () => {}),
            this.assetUsdPrice(tokenPricesMappingTable),
        ]);
        console.log("hlpBalance (wei):", hlpBalance.toString());
        console.log("hlpPrice:", hlpPrice);
        console.log("usdBalance:", (hlpBalance / Math.pow(10, this.assetDecimals)) * hlpPrice);
        return (
            (hlpBalance / Math.pow(10, this.assetDecimals)) * hlpPrice
        )
    }

    async assetUsdPrice(tokenPricesMappingTable) {  
        return await this._fetchHmxPrice();
    }

    async _fetchHmxPrice() {
        const response = await fetch("https://api.dune.com/api/v1/query/3702461/results?limit=1000", {
            headers: {
                "X-Dune-API-Key": "NRSnP5c4r3Rb9j5Ldow4zJXZnqrnbfes",
            },
        });
        const priceData = await response.json();
        const currentPrice = priceData.result.rows[0].price;
        return currentPrice;
    }

    async stakeBalanceOf(owner) {
        try {
            const stakeContractInstance = new ethers.Contract(
                this.stakeFarmContract.address,
                StakeHlp,
                PROVIDER(this.chain),
            );
            const balance = await stakeContractInstance.userTokenAmount(owner);
            console.log("stakeBalanceOf:", balance);
            return balance;
        } catch (error) {
            console.error("Error in stakeBalanceOf:", error);
            return 0;
        }
    }

    _getTheBestTokenAddressToZapIn(inputToken, tokenAddress, InputTokenDecimals) {
        return [this.symbolOfBestTokenToZapOut, this.bestTokenAddressToZapOut, this.decimalOfBestTokenToZapOut];
    }

    _getTheBestTokenAddressToZapOut() {
        return [this.symbolOfBestTokenToZapOut, this.bestTokenAddressToZapOut, this.decimalOfBestTokenToZapOut];
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
