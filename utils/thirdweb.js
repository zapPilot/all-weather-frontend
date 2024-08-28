import { createThirdwebClient } from "thirdweb";
const ethers = require("ethers");
const THIRDWEB_CLIENT = createThirdwebClient({
  clientId: String(process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID),
});

function verifyBatchHash(userOps, entryPoint, chainId) {
  const calculatedBatchHash = _calculateBatchHash(userOps, entryPoint, chainId);
  return calculatedBatchHash;
  // return calculatedBatchHash === providedBatchHash;
}
function _calculateBatchHash(userOps, entryPoint, chainId) {
  const userOpHashes = userOps.map((userOp) =>
    _calculateUserOpHash(userOp, entryPoint, chainId),
  );

  const concatenatedHashes = ethers.utils.hexConcat(userOpHashes);
  return ethers.utils.keccak256(concatenatedHashes);
}

function _calculateUserOpHash(userOp, entryPoint, chainId) {
  const encodedUserOp = _encodeUserOp(userOp); // You'll need to implement this
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["bytes32", "address", "uint256"],
      [ethers.utils.keccak256(encodedUserOp), entryPoint, chainId],
    ),
  );
}

function _encodeUserOp(userOp) {
  return ethers.utils.defaultAbiCoder.encode(
    [
      "address", // sender
      "uint256", // nonce
      "bytes", // initCode
      "bytes", // callData
      "uint256", // callGasLimit
      "uint256", // verificationGasLimit
      "uint256", // preVerificationGas
      "uint256", // maxFeePerGas
      "uint256", // maxPriorityFeePerGas
      "bytes", // paymasterAndData
      "bytes", // signature
    ],
    [
      userOp.sender,
      userOp.nonce,
      userOp.initCode,
      userOp.callData,
      userOp.callGasLimit,
      userOp.verificationGasLimit,
      userOp.preVerificationGas,
      userOp.maxFeePerGas,
      userOp.maxPriorityFeePerGas,
      userOp.paymasterAndData,
      userOp.signature,
    ],
  );
}

export default THIRDWEB_CLIENT;
export { verifyBatchHash };
