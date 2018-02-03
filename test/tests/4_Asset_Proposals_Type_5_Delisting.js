module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];

    let snapshotsEnabled = true;
    let snapshots = [];

    contract('Proposals Asset - Type 5 - PROJECT_DELISTING', accounts => {
        let tx, TestBuildHelper, FundingInputDirect, FundingInputMilestone, ProposalsAsset,
            MilestonesAsset, ApplicationEntity, beforeProposalRequiredStateChanges, FundingAsset, FundingManagerAsset,
            TokenManagerAsset, TokenEntity, ChildItemId, ListingContractAsset, validation = {};

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

                // time travel to development start
                await TestBuildHelper.timeTravelTo(settings.bylaws["development_start"] + 1);
                await TestBuildHelper.doApplicationStateChanges("Development Started", false);


                ApplicationEntity = await TestBuildHelper.getDeployedByName("ApplicationEntity");
                ListingContractAsset = await TestBuildHelper.getDeployedByName("ListingContract");
                ProposalsAsset = await TestBuildHelper.getDeployedByName("Proposals");

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
                    doDeployments:   settings.doDeployments,
                    extra_marketing: settings.extra_marketing
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

                ChildItemId = await ListingContractAsset.itemNum.call();
                // Listing exists, now we create the delisting proposal.

                // Create delisting proposal
                await ProposalsAsset.createDelistingProposal( ChildItemId, {from: wallet1} );

                // create snapshot
                if (snapshotsEnabled) {
                    snapshots[SnapShotKey] = await helpers.web3.evm.snapshot();
                }
            }

            ApplicationEntity = await TestBuildHelper.getDeployedByName("ApplicationEntity");
            MilestonesAsset = await TestBuildHelper.getDeployedByName("Milestones");
            ProposalsAsset = await TestBuildHelper.getDeployedByName("Proposals");
            FundingAsset = await TestBuildHelper.getDeployedByName("Funding");
            FundingManagerAsset = await TestBuildHelper.getDeployedByName("FundingManager");
            TokenManagerAsset = await TestBuildHelper.getDeployedByName("TokenManager");

            let TokenEntityAddress = await TokenManagerAsset.TokenEntity.call();
            let TokenEntityContract = await helpers.getContract("TestToken");
            TokenEntity = await TokenEntityContract.at(TokenEntityAddress);
        });

        it( "current proposal matches PROJECT_DELISTING settings", async () => {

            let RecordNum = await ProposalsAsset.RecordNum.call();
            assert.equal(RecordNum.toNumber(), 1, 'RecordNum does not match');

            let ProposalRecord = await ProposalsAsset.ProposalsById.call(1);
            assert.equal(
                ProposalRecord[2].toString(),
                helpers.utils.getActionIdByName("Proposals", "PROJECT_DELISTING").toString(),
                'Proposal record type does not match'
            );

            assert.equal(
                 ProposalRecord[3].toString(),
                 helpers.utils.getRecordStateIdByName("Proposals", "ACCEPTING_VOTES").toString(),
                 'Proposal record type does not match'
            );

            let ResultRecord = await ProposalsAsset.ResultsByProposalId.call(1);

            // PROJECT_DELISTING is only voted by "locked" tokens
            assert.isTrue(ResultRecord[5], "Vote Recounting should be true.");

        });

        it( "throws if PROJECT_DELISTING proposal was already created once", async () => {
            return helpers.assertInvalidOpcode(async () => {
                await ProposalsAsset.createDelistingProposal( ChildItemId, {from: wallet1} );
            });
        });

        context("Proposal Created - Voting Started", async () => {
            let ProposalId = 1;

            // await TestBuildHelper.displayAllVaultDetails();
            // await TestBuildHelper.displayOwnerAddressDetails();
            // await helpers.utils.displayProposal(helpers, ProposalsAsset, ProposalId);
            // helpers.utils.getProposalEventData(tx.receipt);


            it("throws if trying to vote on a non existing proposal", async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await ProposalsAsset.RegisterVote( 0, true, {from: wallet4} );
                });
            });

            it("throws if trying to vote on a the proposal while having no stake in it", async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await ProposalsAsset.RegisterVote( ProposalId, true, {from: accounts[0]} );
                });
            });

            it("Registers a valid vote if voter has a stake in the proposal, does not require state changes if stake is lower than 50%", async () => {

                let usedWallet = wallet4;
                tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: usedWallet} );
                // await helpers.utils.showGasUsage(helpers, tx, "RegisterVote");
                // await helpers.utils.displayProposal(helpers, ProposalsAsset, ProposalId);

                let ProposalResultRecord = await ProposalsAsset.ResultsByProposalId.call( ProposalId );
                let yesTotals = ProposalResultRecord[3];

                let Power = await ProposalsAsset.getVotingPower.call( ProposalId, usedWallet );
                assert.equal( yesTotals.toString(), Power.toString(), "Totals should match voting power!" );

                let ProposalRecord = await ProposalsAsset.ProposalsById.call( ProposalId );
                let ProposalState = helpers.utils.getRecordStateNameById("Proposals", ProposalRecord[3].toNumber() );

                assert.equal(ProposalState, "ACCEPTING_VOTES", "Proposal state should be ACCEPTING_VOTES");
            });

            it("Registers multiple votes and requires state changes if stake is higher than 50%", async () => {

                let usedWallet = wallet1;
                tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: wallet1} );
                tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: wallet2} );
                tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: wallet3} );

                let ProposalRecord = await ProposalsAsset.ProposalsById.call( ProposalId );
                let ProposalState = helpers.utils.getRecordStateNameById("Proposals", ProposalRecord[3].toNumber() );

                assert.equal(ProposalState, "ACCEPTING_VOTES", "Proposal state should be ACCEPTING_VOTES");

                let hasRequiredStateChanges = await ProposalsAsset.hasRequiredStateChanges.call();
                assert.isTrue(hasRequiredStateChanges, "Proposal should Require State Changes");

            });


            it("Registers multiple YES votes, after processing closes as VOTING_RESULT_YES", async () => {

                tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: wallet1} );
                tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: wallet2} );
                tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: wallet3} );

                // await ProposalsAsset.setVoteCountPerProcess(1);
                await TestBuildHelper.doApplicationStateChanges("VOTING_RESULT_YES", false);

                let ProposalRecord = await ProposalsAsset.ProposalsById.call( ProposalId );
                let ProposalState = helpers.utils.getRecordStateNameById("Proposals", ProposalRecord[3].toNumber() );
                assert.equal(ProposalState, "VOTING_RESULT_YES", "Proposal state should be VOTING_RESULT_YES");
            });

            it("Registers multiple NO votes, after processing closes as VOTING_RESULT_NO", async () => {

                tx = await ProposalsAsset.RegisterVote( ProposalId, false, {from: wallet1} );
                tx = await ProposalsAsset.RegisterVote( ProposalId, false, {from: wallet2} );
                tx = await ProposalsAsset.RegisterVote( ProposalId, false, {from: wallet3} );

                // await ProposalsAsset.setVoteCountPerProcess(1);
                await TestBuildHelper.doApplicationStateChanges("VOTING_RESULT_NO", false);

                let ProposalRecord = await ProposalsAsset.ProposalsById.call( ProposalId );
                let ProposalState = helpers.utils.getRecordStateNameById("Proposals", ProposalRecord[3].toNumber() );
                assert.equal(ProposalState, "VOTING_RESULT_NO", "Proposal state should be VOTING_RESULT_NO");
            });

            it("Registers multiple MIXED votes ( most YES ), some change vote, after processing closes as VOTING_RESULT_YES", async () => {

                tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: wallet1} );
                tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: wallet2} );
                tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: wallet3} );
                tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: wallet4} );

                tx = await ProposalsAsset.RegisterVote( ProposalId, false, {from: wallet2} );

                // await ProposalsAsset.setVoteCountPerProcess(1);
                await TestBuildHelper.doApplicationStateChanges("VOTING_RESULT_YES", false);

                let ProposalRecord = await ProposalsAsset.ProposalsById.call( ProposalId );
                let ProposalState = helpers.utils.getRecordStateNameById("Proposals", ProposalRecord[3].toNumber() );
                assert.equal(ProposalState, "VOTING_RESULT_YES", "Proposal state should be VOTING_RESULT_YES");
            });

            it("Registers multiple MIXED votes ( most NO ), some change vote, after processing closes as VOTING_RESULT_NO", async () => {

                tx = await ProposalsAsset.RegisterVote( ProposalId, false, {from: wallet1} );
                tx = await ProposalsAsset.RegisterVote( ProposalId, false, {from: wallet2} );
                tx = await ProposalsAsset.RegisterVote( ProposalId, false, {from: wallet3} );
                tx = await ProposalsAsset.RegisterVote( ProposalId, false, {from: wallet4} );

                tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: wallet2} );

                // await ProposalsAsset.setVoteCountPerProcess(1);
                await TestBuildHelper.doApplicationStateChanges("VOTING_RESULT_YES", false);

                let ProposalRecord = await ProposalsAsset.ProposalsById.call( ProposalId );
                let ProposalState = helpers.utils.getRecordStateNameById("Proposals", ProposalRecord[3].toNumber() );
                assert.equal(ProposalState, "VOTING_RESULT_NO", "Proposal state should be VOTING_RESULT_NO");
            });


            context("Voting Successful - Processed before voting expiry time", async () => {

                beforeEach(async () => {

                    tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: wallet1} );
                    tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: wallet2} );
                    tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: wallet3} );

                });

                it("throws if trying to vote on a the proposal that has already been finalised", async () => {
                    await TestBuildHelper.doApplicationStateChanges("VOTING_RESULT_YES", false);
                    return helpers.assertInvalidOpcode(async () => {
                        await ProposalsAsset.RegisterVote( ProposalId, true, {from: wallet4} );
                    });
                });

                it("ApplicationEntity state processed, ListingContract delists project", async () => {

                    let initialStatus = await ListingContractAsset.getChildStatus.call( ChildItemId );
                    await TestBuildHelper.doApplicationStateChanges("VOTING_RESULT_YES", false);

                    let afterStatus = await ListingContractAsset.getChildStatus.call( ChildItemId );
                    assert.isFalse(afterStatus, "Child status should be false");

                });

            });

            context("Voting Successful - Voting time expired", async () => {

                beforeEach(async () => {

                    tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: wallet1} );

                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(ProposalId);
                    let proposalEndTime = ProposalRecord[9].toNumber();

                    await TestBuildHelper.timeTravelTo(proposalEndTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("VOTING_RESULT_YES", false);

                });

                it("ApplicationEntity state processed, ListingContract delists project", async () => {

                    let initialStatus = await ListingContractAsset.getChildStatus.call( ChildItemId );
                    await TestBuildHelper.doApplicationStateChanges("VOTING_RESULT_YES", false);

                    let afterStatus = await ListingContractAsset.getChildStatus.call( ChildItemId );
                    assert.isFalse(afterStatus, "Child status should be false");

                });

            });


        });

    });

};