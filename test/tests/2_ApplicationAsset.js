module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    contract('Application Assets', accounts => {
        let app, assetContract = {};
        let assetName = "NewsContract";

        beforeEach(async () => {
            app = await contracts.ApplicationEntity.new();
            assetContract = await helpers.getContract("Test"+assetName).new();

        });

        context("setInitialOwnerAndName()", async () => {

            beforeEach(async () => {
                await assetContract.setInitialApplicationAddress(accounts[0]);
            });

            it('works if linking an asset for the first time', async () => {

                let eventFilter = helpers.utils.hasEvent(
                    await assetContract.setInitialOwnerAndName(assetName),
                    'EventAppAssetOwnerSet(bytes32,address)'
                );
                assert.equal(eventFilter.length, 1, 'EventAppAssetOwnerSet event not received.');
                assert.equal(await assetContract.owner.call(), accounts[0], 'Asset Owner is not accounts[0]');
                assert.isTrue(await assetContract._initialized.call(), 'Asset not initialized');
            });

            it('throws if already owned', async () => {

                await assetContract.setInitialOwnerAndName(assetName);
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.setInitialOwnerAndName(assetName);
                });
            });
        });

        context("applyAndLockSettings()", async () => {

            beforeEach(async () => {
                await assetContract.setInitialApplicationAddress(accounts[0]);
            });

            it('works if called by deployer account and asset is not locked already', async () => {

                await assetContract.setInitialOwnerAndName(assetName);

                let eventFilter = helpers.utils.hasEvent(
                    await assetContract.applyAndLockSettings(),
                    'EventRunBeforeApplyingSettings(bytes32)'
                );

                assert.equal(eventFilter.length, 1, 'EventRunBeforeApplyingSettings event not received.');
                assert.isTrue(await assetContract._settingsApplied.call(), '_settingsApplied not true.');
            });

            it('throws if called before initialization', async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.applyAndLockSettings()
                });
            });

            it('throws if called when settings are already applied', async () => {
                await assetContract.setInitialOwnerAndName(assetName, {from:accounts[0]});
                await assetContract.applyAndLockSettings();
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.applyAndLockSettings()
                });
            });

            it('throws if not called by deployer\'s account', async () => {
                await assetContract.setInitialOwnerAndName(assetName);
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.applyAndLockSettings({from:accounts[1]})
                });
            });

        });

        context("getApplicationAssetAddressByName()", async () => {

            beforeEach(async () => {
                await app["addAsset"+assetName](assetContract.address);
                await assetContract.setInitialApplicationAddress(app.address);

                // set gw address so we can initialize
                await app.setTestGatewayInterfaceEntity(accounts[0]);
            });

            it('works if asset is initialized and owned by an application', async () => {
                // grab ownership of the assets so we can do tests
                await app.initializeAssetsToThisApplication();
                let address = await assetContract.getApplicationAssetAddressByName.call( assetName );
                assert.equal(address, assetContract.address, 'Asset address mismatch!');
            });

            it('works if asset has settings and they are applied', async () => {
                // grab ownership of the assets so we can do tests
                await app.initializeAssetsToThisApplication();

                let eventFilter = helpers.utils.hasEvent(
                    await assetContract.applyAndLockSettings(),
                    'EventRunBeforeApplyingSettings(bytes32)'
                );
                assert.equal(eventFilter.length, 1, 'EventRunBeforeApplyingSettings event not received.');
                assert.isTrue(await assetContract._settingsApplied.call(), '_settingsApplied not true.');

                let address = await assetContract.getApplicationAssetAddressByName.call( assetName );
                assert.equal(address, assetContract.address, 'Asset address mismatch!');
            });

            it('throws if asset name does not exist in the app\'s mapping', async () => {
                // grab ownership of the assets so we can do tests
                await app.initializeAssetsToThisApplication();
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.getApplicationAssetAddressByName.call('SomeRandomAssetName');
                });
            });

        });

        context("transferToNewOwner()", async () => {

            beforeEach(async () => {
                await assetContract.setInitialApplicationAddress(accounts[0]);
            });

            it('works if current caller is owner and requested address is not 0x0', async () => {
                let app2 = await contracts.ApplicationEntity.new();
                await assetContract.setInitialOwnerAndName(assetName);

                let eventFilter = helpers.utils.hasEvent(
                    await assetContract.transferToNewOwner(app2.address),
                    'EventAppAssetOwnerSet(bytes32,address)'
                );
                assert.equal(eventFilter.length, 1, 'EventAppAssetOwnerSet event not received.')
            });

            it('throws if called when internal owner address is invalid', async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.transferToNewOwner(app.address)
                });
            });

            it('throws if owned and called by other address', async () => {
                await assetContract.setInitialOwnerAndName(assetName, {from:accounts[0]});
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.transferToNewOwner(app.address, {from:accounts[1]})
                });
            });

            it('throws if new address is 0x0', async () => {
                await assetContract.setInitialOwnerAndName(assetName);
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.transferToNewOwner(0x0)
                });
            });
        });


        context('Application Bylaws in Application Asset', async () => {
            let TestBuildHelper, TestAsset;
            let platformWalletAddress = accounts[19];

            beforeEach(async () => {

                TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
                await TestBuildHelper.linkToRealGateway();
                await TestBuildHelper.deployAndInitializeApplication();
                await TestBuildHelper.AddAllAssetSettingsAndLock();
                TestAsset = await TestBuildHelper.getDeployedByName("NewsContract");

            });

            it('getAppBylawBytes32 returns correct value set by project settings', async () => {
                let bylaw_name = "tokenSCADA";
                let bylaw_value = settings.bylaws[bylaw_name];

                let val = helpers.web3util.toUtf8( await TestAsset.getAppBylawBytes32.call(bylaw_name) );
                assert.equal(val, bylaw_value, "Value should be " + bylaw_value.toString());
            });

            it('getAppBylawUint256 returns correct value set by project settings', async () => {
                let bylaw_name = "funding_global_soft_cap";
                let bylaw_value = settings.bylaws[bylaw_name];

                let val = await TestAsset.getAppBylawUint256.call(bylaw_name) ;
                assert.equal(val.toString(), bylaw_value.toString(), "Value should be " + bylaw_value.toString());
            });

        });

    });
};