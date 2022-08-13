const { run } = require("hardhat");

//这个函数就是上传合约源码的作用
async function verify(contractAddress, args) {
    console.log("Verifying contract...");
    try {
      await run("verify:verify", {
        address: contractAddress,
        constructorArguments: args,
      });
    } catch (e) {
      if (e.message.toLowerCase().includes("already verified")) {
        console.log("Already verified");
      } else {
        console.error(e);
      }
    }
  }
  module.exports={verify,}