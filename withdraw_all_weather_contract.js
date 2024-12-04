const { ethers } = require("ethers");

async function encodeCalldata() {
  // Define the function signature
  const abi = ["function withdraw(uint256 pid, uint256 _value)"];

  // Create an Interface object
  const iface = new ethers.utils.Interface(abi);

  // Encode the function call with arguments
  const calldata = iface.encodeFunctionData("withdraw", [
    "8",
    ethers.BigNumber.from("46534952883539236"),
  ]);

  console.log("Encoded Calldata:", calldata);
}

encodeCalldata();
