describe("fulfillRandomWords", function () {
  beforeEach(async () => {
    await raffle.enterRaffle({ value: raffleEntranceFee });
    await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
    await network.provider.request({ method: "evm_mine", params: [] });
  });
  it("can only be called after performupkeep", async () => {
    await expect(
      vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address) // reverts if not fulfilled
    ).to.be.revertedWith("nonexistent request");
    await expect(
      vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address) // reverts if not fulfilled
    ).to.be.revertedWith("nonexistent request");
  });
  // This test is too big...
  it("picks a winner, resets, and sends money", async () => {
    const additionalEntrances = 3; // to test
    const startingIndex = 2;
    for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
      // i = 2; i < 5; i=i+1
      raffle = raffleContract.connect(accounts[i]); // Returns a new instance of the Raffle contract connected to player
      await raffle.enterRaffle({ value: raffleEntranceFee });
    }
    const startingTimeStamp = await raffle.getLastTimeStamp(); // stores starting timestamp (before we fire our event)

    // This will be more important for our staging tests...
    await new Promise(async (resolve, reject) => {
      raffle.once("WinnerPicked", async () => {
        // event listener for WinnerPicked
        console.log("WinnerPicked event fired!");
        // assert throws an error if it fails, so we need to wrap
        // it in a try/catch so that the promise returns event
        // if it fails.
        try {
          // Now lets get the ending values...
          const recentWinner = await raffle.getRecentWinner();
          const raffleState = await raffle.getRaffleState();
          const winnerBalance = await accounts[2].getBalance();
          const endingTimeStamp = await raffle.getLastTimeStamp();
          await expect(raffle.getPlayer(0)).to.be.reverted;
          // Comparisons to check if our ending values are correct:
          assert.equal(recentWinner.toString(), accounts[2].address);
          assert.equal(raffleState, 0);
          assert.equal(
            winnerBalance.toString(),
            startingBalance // startingBalance + ( (raffleEntranceFee * additionalEntrances) + raffleEntranceFee )
              .add(
                raffleEntranceFee
                  .mul(additionalEntrances)
                  .add(raffleEntranceFee)
              )
              .toString()
          );
          assert(endingTimeStamp > startingTimeStamp);
          resolve(); // if try passes, resolves the promise
        } catch (e) {
          reject(e); // if try fails, rejects the promise
        }
      });

      const tx = await raffle.performUpkeep("0x");
      const txReceipt = await tx.wait(1);
      const startingBalance = await accounts[2].getBalance();
      await vrfCoordinatorV2Mock.fulfillRandomWords(
        txReceipt.events[1].args.requestId,
        raffle.address
      );
    });
  });
});
