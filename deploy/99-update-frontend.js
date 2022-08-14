const { ethers, network } = require("hardhat");
const fs = require("fs");
require("dotenv").config();

const FRONT_END_ADDRESS_FILE =
  "../nextjs-smartcontract-lottery-fcc/constants/contractAddresses.json";
const FRONT_END_ABI_FILE =
  "../nextjs-smartcontract-lottery-fcc/constants/abi.json";

module.exports = async function () {
  if (process.env.UPDATE_FRONT_END) {
    console.log("Updating front end...");
    updateContractAddress();
    updateAbi();
  }

  async function updateAbi() {
    const raffle = await ethers.getContract("Raffle");
    fs.writeFileSync(
      FRONT_END_ABI_FILE,
      raffle.interface.format(ethers.utils.FormatTypes.json)
    );
  }
  async function updateContractAddress() {
    const raffle = await ethers.getContract("Raffle");
    const chainId = network.config.chainId.toString();
    const addresses = JSON.parse(
      fs.readFileSync(FRONT_END_ADDRESS_FILE, "utf8")
    );
    if (chainId in addresses) {
      if (!addresses[chainId].includes(raffle.address)) {
        addresses[chainId].push(raffle.address);
      }
    } else {
      addresses[chainId] = [raffle.address];
    }
    fs.writeFileSync(FRONT_END_ADDRESS_FILE, JSON.stringify(addresses));
  }
};
