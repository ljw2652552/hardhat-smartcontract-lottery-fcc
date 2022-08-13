const {
  networkConfig,
  developmentChains,
} = require("../helper-hardhat-config");
// set proxy
const { ProxyAgent, setGlobalDispatcher } = require("undici");

const {
  getNamedAccounts,
  deployments,
  network,
  run,
  ethers,
} = require("hardhat");
const { verify } = require("../utils/verify");

const FUND_AMOUNT = "1000000000000000000000";

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock;
  if (chainId == 31337) {
    //需要部署mock vrf
    // const vrfCoordinatorV2Mock = await deployments.get("VRFCoordinatorV2Mock");
    vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
    const txResponse = await vrfCoordinatorV2Mock.createSubscription();
    const txReceipt = await txResponse.wait();
    subscriptionId = await txReceipt.events[0].args.subId;
    console.log(`subscriptionId: ${subscriptionId}`);
    // Fund the subscription
    // Our mock makes it so we don't actually have to worry about sending fund
    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT);
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
    subscriptionId = networkConfig[chainId]["subscriptionId"];
    // const proxyAgent = new ProxyAgent("http://127.0.0.1:7890"); // change to yours
    // setGlobalDispatcher(proxyAgent);
  }
  log("----------------------------------------------------");
  const arguments = [
    vrfCoordinatorV2Address,
    networkConfig[chainId]["raffleEntranceFee"],
    networkConfig[chainId]["gasLane"],
    subscriptionId,
    networkConfig[chainId]["callbackGasLimit"],
    networkConfig[chainId]["keepersUpdateInterval"],
  ];
  const raffle = await deploy("Raffle", {
    from: deployer,
    args: arguments,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });
  if (chainId == 31337) {
    await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address);
  }

  //Verify the deployment
  if (!developmentChains.includes(network.name) && process.env.ES_API_KEY) {
    log("Verifying...");
    await verify(raffle.address, arguments);
  }
};
module.exports.tags = ["all", "raffle"];
