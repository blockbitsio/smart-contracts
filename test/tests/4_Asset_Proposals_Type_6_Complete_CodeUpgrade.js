module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];

    let snapshotsEnabled = true;
    let snapshots = [];

    contract('Proposals Asset - Type 6 - AFTER_COMPLETE_CODE_UPGRADE', accounts => {
        let tx, TestBuildHelper, TestBuildHelperUpgrade, FundingInputDirect, FundingInputMilestone, ProposalsAsset,
            MilestonesAsset, ApplicationEntity, beforeProposalRequiredStateChanges, FundingManagerAsset,
            TokenManagerAsset, TokenEntity, validation, GatewayInterface = {};

        let ProposalId;
        let assetName = "Proposals";
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
                await TestBuildHelper.linkToRealGateway();
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

                // time travel to pre ico start time
                await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                await TestBuildHelper.doApplicationStateChanges("After PRE ICO START", false);

                await FundingInputMilestone.sendTransaction({
                    value: 5000 * helpers.solidity.ether,
                    from: wallet1
                });

                await FundingInputDirect.sendTransaction({
                    value: 5000 * helpers.solidity.ether,
                    from: wallet2
                });

                // time travel to start of ICO, and change states
                await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                await TestBuildHelper.doApplicationStateChanges("After ICO START", false);

                await FundingInputDirect.sendTransaction({
                    value: 10000 * helpers.solidity.ether,
                    from: wallet3
                });

                await FundingInputMilestone.sendTransaction({
                    value: 10000 * helpers.solidity.ether,
                    from: wallet4
                });

                // time travel to end of ICO, and change states
                await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                await TestBuildHelper.doApplicationStateChanges("Funding End", false);


                MilestonesAsset = await TestBuildHelper.getDeployedByName("Milestones");
                ProposalsAsset = await TestBuildHelper.getDeployedByName("Proposals");

                ProposalId = 0;
                let MilestoneNum = await MilestonesAsset.RecordNum.call();
                let tx;

                for(let i = 1; i <= MilestoneNum.toNumber(); i++ ) {

                    let MilestoneId = await MilestonesAsset.currentRecord.call();
                    let MilestoneRecord = await MilestonesAsset.Collection.call( MilestoneId );

                    // time travel to start of milestone

                    let start_time;
                    if (i === 1) {
                        start_time = settings.bylaws["development_start"] + 1;
                    } else {
                        start_time = MilestoneRecord[4].add(1);
                    }

                    await TestBuildHelper.timeTravelTo(start_time);
                    await TestBuildHelper.doApplicationStateChanges("Development Started", false);

                    let currentTime = await MilestonesAsset.getTimestamp.call();
                    // set meeting time 10 days from now.
                    let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600 );

                    await MilestonesAsset.setCurrentMilestoneMeetingTime(meetingTime);
                    await TestBuildHelper.doApplicationStateChanges("Set Meeting Time", false);

                    tx = await TestBuildHelper.timeTravelTo(meetingTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("At Meeting Time", false);

                    ProposalId++;

                    // vote yes
                    tx = await ProposalsAsset.RegisterVote(ProposalId, true, {from: wallet1});

                    // time travel to end of proposal
                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(ProposalId);
                    let proposalEndTime = ProposalRecord[9].toNumber();
                    tx = await TestBuildHelper.timeTravelTo(proposalEndTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("Voting ended", false);

                    if(i === MilestoneNum.toNumber()) {
                        i = i+10;
                    }
                }


                // create snapshot
                if (snapshotsEnabled) {
                    snapshots[SnapShotKey] = await helpers.web3.evm.snapshot();
                }
            }

            GatewayInterface = await TestBuildHelper.getDeployedByName("GatewayInterface");
            ApplicationEntity = await TestBuildHelper.getDeployedByName("ApplicationEntity");
            MilestonesAsset = await TestBuildHelper.getDeployedByName("Milestones");
            ProposalsAsset = await TestBuildHelper.getDeployedByName("Proposals");
            FundingManagerAsset = await TestBuildHelper.getDeployedByName("FundingManager");
            TokenManagerAsset = await TestBuildHelper.getDeployedByName("TokenManager");

            let TokenEntityAddress = await TokenManagerAsset.TokenEntity.call();
            let TokenEntityContract = await helpers.getContract("TestToken");
            TokenEntity = await TokenEntityContract.at(TokenEntityAddress);

            let RecordNum = await ProposalsAsset.RecordNum.call();
            ProposalId = RecordNum.toNumber();
        });


        it( "current proposal matches AFTER_COMPLETE_CODE_UPGRADE settings", async () => {

            ProposalId++;
            TestBuildHelperUpgrade = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
            await TestBuildHelperUpgrade.deployUpgradeApplication( GatewayInterface.address, TestBuildHelper );

            // await TestBuildHelper.showApplicationStates();

            let ProposalRecord = await ProposalsAsset.ProposalsById.call(ProposalId);
            assert.equal(
                ProposalRecord[2].toString(),
                helpers.utils.getActionIdByName("Proposals", "AFTER_COMPLETE_CODE_UPGRADE").toString(),
                'Proposal record type does not match'
            );

            assert.equal(
                ProposalRecord[3].toString(),
                helpers.utils.getRecordStateIdByName("Proposals", "ACCEPTING_VOTES").toString(),
                'Proposal record type does not match'
            );

            let ResultRecord = await ProposalsAsset.ResultsByProposalId.call(ProposalId);

            // IN_DEVELOPMENT_CODE_UPGRADE is only voted by "locked" tokens
            assert.isTrue(ResultRecord[5], "Vote Recounting should be true.");

        });

        it("DEVELOPMENT_COMPLETE, Upgrade to second app, request upgrade to third - Proposal processed.", async () => {

            ProposalId++;

            // >>>>>>>>>>> APP UPGRADE
            TestBuildHelperUpgrade = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
            await TestBuildHelperUpgrade.deployUpgradeApplication( GatewayInterface.address, TestBuildHelper );

            let ProposalRecord = await ProposalsAsset.ProposalsById.call(ProposalId);
            let proposalEndTime = ProposalRecord[9].toNumber();
            tx = await TestBuildHelper.timeTravelTo(proposalEndTime + 1);
            tx = await TestBuildHelperUpgrade.timeTravelTo(proposalEndTime + 1);
            await TestBuildHelper.doApplicationStateChanges("Voting ended", false);
            await TestBuildHelperUpgrade.doApplicationStateChanges("Voting ended", false);
            await TestBuildHelperUpgrade.addSettingsAndLockOnNewAssetsInApplication();
            // switch to using the newly deployed app.
            // <<<<<<<<<<<<<<

            // old app remains as UPGRADED
            let appState = await ApplicationEntity.CurrentEntityState.call();
            let appStateCode = helpers.utils.getEntityStateIdByName("ApplicationEntity", "UPGRADED");
            assert.equal(appState.toString(), appStateCode, "ApplicationEntity state should be UPGRADED");

            // New app is DEVELOPMENT_COMPLETE
            ApplicationEntity = await TestBuildHelperUpgrade.getDeployedByName("ApplicationEntity");
            appState = await ApplicationEntity.CurrentEntityState.call();
            appStateCode = helpers.utils.getEntityStateIdByName("ApplicationEntity", "DEVELOPMENT_COMPLETE");
            assert.equal(appState.toString(), appStateCode, "ApplicationEntity state should be DEVELOPMENT_COMPLETE");

            let TestBuildHelperUpgradeTwo = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
            await TestBuildHelperUpgradeTwo.deployUpgradeApplication( GatewayInterface.address, TestBuildHelperUpgrade );
        });

    });
};