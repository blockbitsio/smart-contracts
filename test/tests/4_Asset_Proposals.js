module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    contract('Proposals Asset', accounts => {
        let app, assetContract, assetName = {};

        beforeEach(async () => {
            app = await contracts.ApplicationEntity.new();
            assetName = "Proposals";
            assetContract = await helpers.getContract("Test" + assetName).new();
        });

        it("setVoteCountPerProcess throws if value is not higher than 0", async () => {
            let newValue = 0x0;
            helpers.assertInvalidOpcode(async () => {
                await assetContract.setVoteCountPerProcess(newValue);
            });
        });

        it("setVoteCountPerProcess properly sets value", async () => {
            let newValue = 50;
            await assetContract.setVoteCountPerProcess(newValue);
            let VoteCountPerProcessAfter = await assetContract.VoteCountPerProcess.call();
            assert.equal(VoteCountPerProcessAfter.toNumber(), newValue, 'VoteCountPerProcessAfter should be newValue');
        });

    });
};