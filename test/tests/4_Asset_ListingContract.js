module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;
    let token_settings = setup.settings.token;

    contract('ListingContract Asset', accounts => {
        let assetContract, tx, TestBuildHelper, ApplicationEntity = {};
        let assetName = "ListingContract";
        let platformWalletAddress = accounts[19];

        beforeEach(async () => {
            TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
            await TestBuildHelper.deployAndInitializeApplication();
            await TestBuildHelper.AddAllAssetSettingsAndLockExcept(assetName);
            assetContract = await TestBuildHelper.getDeployedByName(assetName);
            ApplicationEntity = await TestBuildHelper.getDeployedByName("ApplicationEntity");
        });

        context("setManagerAddress()", async () => {

            it('throws if caller is not deployer', async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.setManagerAddress( accounts[5] , {from: accounts[2]} );
                });

            });

            it('works if caller is applicationEntity', async () => {
                let managerAddress = await assetContract.managerAddress.call();
                assert.equal(managerAddress, 0, "managerAddress should be 0");
                await assetContract.setManagerAddress( accounts[5] , {from: accounts[0]} );
                managerAddress = await assetContract.managerAddress.call();
                assert.equal(managerAddress, accounts[5], "managerAddress should be accounts[5]");
            });
        });

        context("addItem()", async () => {

            it('throws if addItem caller is not applicationEntity', async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.addItem("TestName", await assetContract.address.toString());
                });

            });

            it('works if caller is applicationEntity', async () => {
                let testName = "TestName";
                let application = await TestBuildHelper.getDeployedByName("ApplicationEntity");
                let deployer = await application.deployerAddress.call();
                assert.equal(deployer, accounts[0], "Deployer address mismatch!");
                await application.callTestListingContractAddItem(testName, await assetContract.address.toString());

                let itemNum = await assetContract.itemNum.call();
                assert.equal(itemNum, 1, "Item number mismatch");

                let item = await assetContract.items.call(1);
                let itemName = helpers.web3util.toUtf8(item[0]);
                assert.equal(itemName, testName, "Item name mismatch!");
            });

            it('works if caller is manager address', async () => {

                let managerAddress = await assetContract.managerAddress.call();
                assert.equal(managerAddress, 0, "managerAddress should be 0");
                await assetContract.setManagerAddress( accounts[5] , {from: accounts[0]} );
                managerAddress = await assetContract.managerAddress.call();
                assert.equal(managerAddress, accounts[5], "managerAddress should be accounts[5]");

                let testName = "TestName";
                await assetContract.addItem(testName, await assetContract.address.toString(), {from: accounts[5]});

                let itemNum = await assetContract.itemNum.call();
                assert.equal(itemNum, 1, "Item number mismatch");

                let item = await assetContract.items.call(1);
                let itemName = helpers.web3util.toUtf8(item[0]);
                assert.equal(itemName, testName, "Item name mismatch!");
            });

        });

        context("getNewsContractAddress()", async () => {


            it('throws if the child does not actually exist', async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.getNewsContractAddress.call(99);
                });
            });

            it('throws if the child itemAddress is invalid', async () => {

                let testName = "TestName";
                let application = await TestBuildHelper.getDeployedByName("ApplicationEntity");

                let EmptyStubContract = await helpers.getContract("EmptyStub");
                let EmptyStub = await EmptyStubContract.new();

                await application.callTestListingContractAddItem(testName, "0x0");

                let itemNum = await assetContract.itemNum.call();
                assert.equal(itemNum, 1, "Item number mismatch");

                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.getNewsContractAddress.call(1);
                });
            });


            it('returns a news contract address if the child is an actual ApplicationEntity', async () => {
                let testName = "TestName";
                let application = await TestBuildHelper.getDeployedByName("ApplicationEntity");

                let TestBuildHelperSecond = new helpers.TestBuildHelper(setup, assert, accounts);
                let ChildNewsContract = await TestBuildHelperSecond.deployAndInitializeAsset("NewsContract");
                let childApplication = await TestBuildHelperSecond.getDeployedByName("ApplicationEntity");

                await application.callTestListingContractAddItem(testName, await childApplication.address.toString());

                let linkedChildAddress = await assetContract.getNewsContractAddress.call(1);
                let ChildNewsContractAddress = await ChildNewsContract.address.toString();

                assert.equal(linkedChildAddress, ChildNewsContractAddress, "Address mismatch!");
            });

        });


        context("delistChild()", async () => {

            let ChildItemId;

            beforeEach(async () => {

                // first we need to add a listing.

                let testName = "TestName";
                let thisTime = await ApplicationEntity.getTimestamp.call();

                let child_funding_periods = settings.funding_periods;
                let child_bylaws = settings.bylaws;

                // update funding periods and milestone start times, and development start time bylaw
                child_funding_periods[0].start_time = thisTime.toNumber() + (86400 * 7) ;
                child_funding_periods[0].end_time = thisTime.toNumber() + (86400 * 14);

                child_funding_periods[1].start_time = thisTime.toNumber() + (86400 * 21);
                child_funding_periods[1].end_time = thisTime.toNumber() + (86400 * 60);

                // development_start
                child_bylaws["development_start"] = child_funding_periods[1].end_time + (86400 * 14);

                let childSettings = {
                    bylaws:          child_bylaws,
                    funding_periods: child_funding_periods,
                    milestones:      settings.milestones,
                    token:           settings.token,
                    tokenSCADA:      settings.tokenSCADA,
                    solidity:        settings.solidity,
                    doDeployments:   settings.doDeployments
                };

                let childSetup = helpers.utils.getSetupClone(setup, childSettings);

                let TestBuildHelperSecond = new helpers.TestBuildHelper(childSetup, assert, accounts, accounts[0]);
                await TestBuildHelperSecond.deployAndInitializeApplication();
                await TestBuildHelperSecond.AddAllAssetSettingsAndLock();
                await TestBuildHelperSecond.doApplicationStateChanges("BEFORE Funding Start", false);

                let childApplication = await TestBuildHelperSecond.getDeployedByName("ApplicationEntity");
                let childApplicationState = await childApplication.CurrentEntityState.call();
                let requiredAppState = await helpers.utils.getEntityStateIdByName("ApplicationEntity", "WAITING");
                assert.equal(childApplicationState.toString(), requiredAppState.toString(), 'Child application state should be WAITING.');

                await ApplicationEntity.callTestListingContractAddItem(testName, childApplication.address);

                ChildItemId = await assetContract.itemNum.call();
                // Listing exists, now we create the delisting proposal.

            });

            it('throws if called by any address other than Proposals Asset', async () => {

                let itemNum = await assetContract.itemNum.call();
                assert.equal(itemNum, 1, "Item number mismatch");

                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.delistChild(1);
                });
            });

            it('works if called by proposals asset, resulting in a child with status == false', async () => {

                let ProposalsAsset = TestBuildHelper.getDeployedByName("Proposals");

                let itemStatus = await assetContract.getChildStatus.call(ChildItemId);
                assert.isTrue(itemStatus, "Status should be true!");

                await ProposalsAsset.callTestListingContractDelistChild(ChildItemId);

                itemStatus = await assetContract.getChildStatus.call(ChildItemId);
                assert.isFalse(itemStatus, "Status should be false!");
            });

        });

    });
};