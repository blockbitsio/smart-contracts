module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;
    let token_settings = setup.settings.token;

    contract('NewsContract Asset', accounts => {
        let assetContract, tx, TestBuildHelper = {};
        let assetName = "NewsContract";

        beforeEach(async () => {
            TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts);
            assetContract = await TestBuildHelper.deployAndInitializeAsset( assetName );
        });

        context("addItem()", async () => {

            it('throws if called by anyone else but the deployer address', async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.addItem("bytes32", 123456, {from: accounts[2]});
                });
            });

            it('works if called by deployer address', async () => {
                await assetContract.addItem("bytes32", 123456);

                let itemNum = await assetContract.itemNum.call();
                assert.equal(itemNum, 1, "Item number mismatch!");

                let item = await assetContract.items.call(1);
                assert.equal(helpers.web3util.toUtf8(item[0]), "bytes32", "Item hash mismatch!");
            });

        });

        context("addInternalMessage()", async () => {

            it('throws if called by anyone else but the Application address', async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.addInternalMessage(1, {from: accounts[2]});
                });
            });

            it('works if called by Application address', async () => {
                let stateCode = 100;
                let application = await TestBuildHelper.getDeployedByName("ApplicationEntity");
                await application.callTestNewsContractAddInternalMessage(stateCode);

                let itemNum = await assetContract.itemNum.call();
                assert.equal(itemNum, 1, "Item number mismatch!");

                let item = await assetContract.items.call(1);
                assert.equal(item[1], stateCode, "State code mismatch!");
            });

        });



    });
};