module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];

    let snapshotsEnabled = true;
    let snapshots = [];

    contract('Marketing - Extra Funding Pool - before start time', accounts => {
        let tx, TestBuildHelper, FundingInputDirect, FundingInputMilestone, ProposalsAsset,
            MilestonesAsset, ApplicationEntity, beforeProposalRequiredStateChanges, FundingAsset, FundingManagerAsset,
            TokenManagerAsset, TokenEntity, ExtraFundingInputMarketing, validation = {};

        let platformWalletAddress = accounts[19];

        let wallet1 = accounts[10];
        let wallet2 = accounts[11];
        let wallet3 = accounts[12];
        let wallet4 = accounts[13];
        let wallet5 = accounts[14];


        beforeEach(async () => {

            let SnapShotKey = "ApplicationInit";
            if (typeof snapshots[SnapShotKey] !== "undefined" && snapshotsEnabled) {
                // restore snapshot
                await helpers.web3.evm.revert(snapshots[SnapShotKey]);
                // save again because whomever wrote test rpc had the impression no one would ever restore twice.. dafuq
                snapshots[SnapShotKey] = await helpers.web3.evm.snapshot();

            } else {

                TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
                await TestBuildHelper.deployAndInitializeApplication();
                await TestBuildHelper.AddAllAssetSettingsAndLock();
                let FundingContract = await TestBuildHelper.getDeployedByName("Funding");

                // funding inputs
                let FundingInputDirectAddress = await FundingContract.DirectInput.call();
                let FundingInputMilestoneAddress = await FundingContract.MilestoneInput.call();
                let FundingInputDirectContract = await helpers.getContract('FundingInputDirect');
                let FundingInputMilestoneContract = await helpers.getContract('FundingInputMilestone');
                FundingInputDirect = await FundingInputDirectContract.at(FundingInputDirectAddress);
                FundingInputMilestone = await FundingInputMilestoneContract.at(FundingInputMilestoneAddress);

                await TestBuildHelper.timeTravelTo( settings.extra_marketing.start_date - 60 );

                // create snapshot
                if (snapshotsEnabled) {
                    snapshots[SnapShotKey] = await helpers.web3.evm.snapshot();
                }
            }

            FundingAsset = await TestBuildHelper.getDeployedByName("Funding");
            FundingManagerAsset = await TestBuildHelper.getDeployedByName("FundingManager");
            TokenManagerAsset = await TestBuildHelper.getDeployedByName("TokenManager");
            let TokenEntityAddress = await TokenManagerAsset.TokenEntity.call();
            let TokenEntityContract = await helpers.getContract("TestToken");
            TokenEntity = await TokenEntityContract.at(TokenEntityAddress);

            ExtraFundingInputMarketing = await TestBuildHelper.getDeployedByName("ExtraFundingInputMarketing");

        });

        it("throws if trying to set settings again after they were already set once", async() => {

            let settings_added = await ExtraFundingInputMarketing.settings_added.call();
            assert.equal(settings_added.toString(), "true", 'settings_added should be true');

            return helpers.assertInvalidOpcode(async () => {
                await ExtraFundingInputMarketing.addSettings(
                    ExtraFundingInputMarketing.address,         // address
                    ExtraFundingInputMarketing.address,         // address
                    1,                                          // 1 wei
                    20000,                                      // 20 000 BBX per ETH
                    1517356800,                                 // 31.01.2018
                    1520640000                                  // 10.03.2018
                );
            });
        });

        it("throws if trying to buy tokens", async() => {
            return helpers.assertInvalidOpcode(async () => {
                await ExtraFundingInputMarketing.sendTransaction({
                    value: 10 * helpers.solidity.ether,
                    from: wallet2
                });
            });
        });

        it("has correct settings", async() => {
            let setting_start_time = await ExtraFundingInputMarketing.start_time.call();
            let setting_TokenManagerEntity = await ExtraFundingInputMarketing.TokenManagerEntity.call();
            let setting_outputWalletAddress = await ExtraFundingInputMarketing.outputWalletAddress.call();
            let setting_hardCap = await ExtraFundingInputMarketing.hardCap.call();
            let setting_tokensPerEth = await ExtraFundingInputMarketing.tokensPerEth.call();
            let setting_end_time = await ExtraFundingInputMarketing.end_time.call();
            let settings_added = await ExtraFundingInputMarketing.settings_added.call();

            assert.equal(setting_TokenManagerEntity.toString(), TokenManagerAsset.address.toString(), 'TokenManagerAsset address should match');
            assert.equal(setting_outputWalletAddress.toString(), platformWalletAddress.toString(), 'platformWalletAddress address should match');
            assert.equal(setting_hardCap.toString(), settings.extra_marketing.hard_cap.toString(), 'hard_cap should match');
            assert.equal(setting_tokensPerEth.toString(), settings.extra_marketing.tokens_per_eth.toString(), 'tokens_per_eth should match');
            assert.equal(setting_start_time.toString(), settings.extra_marketing.start_date.toString(), 'start_date should match');
            assert.equal(setting_end_time.toString(), settings.extra_marketing.end_date.toString(), 'end_date should match');
            assert.equal(settings_added.toString(), "true", 'settings_added should be true');
        });
    });
};