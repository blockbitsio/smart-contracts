module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    contract('Application Entity Second', accounts => {
        let app, app2, gateway, UpgradeTestAsset, UpgradeTestAssetAddress = {};

        beforeEach(async () => {
            let appContract = await helpers.getContract("TestApplicationEntitySecond");
            app = await appContract.new();
            gateway = await contracts.GatewayInterface.new();
            let UpgradeTestAssetContract = await helpers.getContract("TestUpgradeTestAsset");
            UpgradeTestAsset = await UpgradeTestAssetContract.new();
            await UpgradeTestAsset.setInitialApplicationAddress(app.address);
            UpgradeTestAssetAddress = await UpgradeTestAsset.address;
        });

        context('initializeNewAssetToThisApplication()', async () => {
            beforeEach(async () => {
                gateway = await contracts.GatewayInterface.new();
            });

            it('throws if not an asset', async () => {
                // gateway is accounts[0].. deployment account
                await app.setTestGatewayInterfaceEntity(accounts[0]);

                let emptystub = await contracts.EmptyStub.new();
                await app.addAssetUpgradeTestAsset(await emptystub.address);
                // should revert in app @ call setInitialOwnerAndName as it is missing in the empty stub
                return helpers.assertInvalidOpcode(async () => {
                    await app.initializeNewAssetToThisApplication("UpgradeTestAsset");
                });
            });

            it('throws if name does not match the asset', async () => {
                // gateway is accounts[0].. deployment account
                await app.setTestGatewayInterfaceEntity(accounts[0]);

                let emptystub = await contracts.EmptyStub.new();
                await app.addAssetUpgradeTestAsset(await emptystub.address);
                // should revert in app @ call setInitialOwnerAndName as it is missing in the empty stub
                return helpers.assertInvalidOpcode(async () => {
                    await app.initializeNewAssetToThisApplication("UpgradeTestAsset");
                });
            });

            it('throws if caller is not the deployer', async () => {
                await app.setTestGatewayInterfaceEntity(gateway.address);
                await app.addAssetUpgradeTestAsset(UpgradeTestAssetAddress);
                // should revert in app @ call setInitialOwnerAndName as it is missing in the empty stub
                return helpers.assertInvalidOpcode(async () => {
                    await app.initializeNewAssetToThisApplication("UpgradeTestAsset", {from: accounts[1]});
                });
            });

            it('works if caller is the deployer, and asset was already added', async () => {
                await app.setTestGatewayInterfaceEntity(gateway.address);
                await app.addAssetUpgradeTestAsset(UpgradeTestAssetAddress);
                await app.initializeNewAssetToThisApplication("UpgradeTestAsset");
            });
        });
    });
};