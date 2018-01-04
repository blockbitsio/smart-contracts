module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];

    let snapshotsEnabled = true;
    let snapshots = [];

    contract('Proposals Asset - Type 4 - MILESTONE_DEADLINE', accounts => {
        let tx, TestBuildHelper, FundingInputDirect, FundingInputMilestone, ProposalsAsset,
            MilestonesAsset, ApplicationEntity, beforeProposalRequiredStateChanges, FundingAsset, FundingManagerAsset,
            TokenManagerAsset, TokenEntity, validation = {};

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
                    value: 10000 * helpers.solidity.ether,
                    from: wallet1
                });

                await FundingInputDirect.sendTransaction({
                    value: 10000 * helpers.solidity.ether,
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

                // time travel to end of milestone
                let duration = settings.milestones[0].duration;
                let time = settings.bylaws["development_start"] + duration +1;

                MilestonesAsset = await TestBuildHelper.getDeployedByName("Milestones");

                let currentTime = await MilestonesAsset.getTimestamp.call();
                let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600);

                await MilestonesAsset.setCurrentMilestoneMeetingTime(meetingTime);
                await TestBuildHelper.doApplicationStateChanges("Meeting time set", false);

                tx = await TestBuildHelper.timeTravelTo(meetingTime + 1);

                await TestBuildHelper.doApplicationStateChanges("At Meeting time", false);

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

        it( "current proposal matches MILESTONE_DEADLINE settings", async () => {

            let RecordNum = await ProposalsAsset.RecordNum.call();
            assert.equal(RecordNum.toNumber(), 1, 'RecordNum does not match');

            let ProposalRecord = await ProposalsAsset.ProposalsById.call(1);
            assert.equal(
                ProposalRecord[2].toString(),
                helpers.utils.getActionIdByName("Proposals", "MILESTONE_DEADLINE").toString(),
                'Proposal record type does not match'
            );

            assert.equal(
                 ProposalRecord[3].toString(),
                 helpers.utils.getRecordStateIdByName("Proposals", "ACCEPTING_VOTES").toString(),
                 'Proposal record type does not match'
            );

            let ResultRecord = await ProposalsAsset.ResultsByProposalId.call(1);

            // MILESTONE_DEADLINE is only voted by "locked" tokens
            assert.isFalse(ResultRecord[5], "Vote Recounting should be false.");

        });

        it( "throws if MILESTONE_DEADLINE proposal was already created once", async () => {
            return helpers.assertInvalidOpcode(async () => {
                await MilestonesAsset.callTestCreateMilestoneAcceptanceProposal()
            });
        });

        context("Proposal Created - Voting Started", async () => {
            let ProposalId = 1;

            // await TestBuildHelper.displayAllVaultDetails();
            // await TestBuildHelper.displayOwnerAddressDetails();

            it("throws if trying to vote on a non existing proposal", async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await ProposalsAsset.RegisterVote( 0, true, {from: wallet4} );
                });
            });

            it("throws if trying to vote on a the proposal while having no stake in it", async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await ProposalsAsset.RegisterVote( ProposalId, true, {from: wallet2} );
                });
            });

            it("Registers a valid vote if voter has a stake in the proposal", async () => {

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

            it("YES Vote, Annuls and registers a new valid vote if voter already voted, has a stake in the proposal, and proposal is not closed", async () => {

                let usedWallet = wallet4;
                tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: usedWallet} );

                let ProposalResultRecord = await ProposalsAsset.ResultsByProposalId.call( ProposalId );
                let yesTotals = ProposalResultRecord[3];

                let Power = await ProposalsAsset.getVotingPower.call( ProposalId, usedWallet );
                assert.equal( yesTotals.toString(), Power.toString(), "Totals should match voting power!" );

                let ProposalRecord = await ProposalsAsset.ProposalsById.call( ProposalId );
                let ProposalState = helpers.utils.getRecordStateNameById("Proposals", ProposalRecord[3].toNumber() );

                assert.equal(ProposalState, "ACCEPTING_VOTES", "Proposal state should be ACCEPTING_VOTES");

                // change from yes to no

                tx = await ProposalsAsset.RegisterVote( ProposalId, false, {from: usedWallet} );

                ProposalResultRecord = await ProposalsAsset.ResultsByProposalId.call( ProposalId );
                let totalSoFar = ProposalResultRecord[2];
                yesTotals = ProposalResultRecord[3];
                let noTotals = ProposalResultRecord[4];
                let calcTotals = new helpers.BigNumber(0);
                calcTotals = calcTotals.add(yesTotals);
                calcTotals = calcTotals.add(noTotals);

                assert.equal( yesTotals.toString(), 0, "Yes Totals should be 0!" );
                assert.equal( noTotals.toString(), Power.toString(), "Totals should match voting power!" );
                assert.equal( totalSoFar.toString(), calcTotals.toString(), "calcTotals should match totalSoFar" );

            });

            it("NO Vote, Annuls and registers a new valid vote if voter already voted, has a stake in the proposal, and proposal is not closed", async () => {

                let usedWallet = wallet4;
                tx = await ProposalsAsset.RegisterVote( ProposalId, false, {from: usedWallet} );

                let ProposalResultRecord = await ProposalsAsset.ResultsByProposalId.call( ProposalId );
                let yesTotals = ProposalResultRecord[3];
                let noTotals = ProposalResultRecord[4];

                let Power = await ProposalsAsset.getVotingPower.call( ProposalId, usedWallet );
                assert.equal( noTotals.toString(), Power.toString(), "Totals should match voting power!" );

                let ProposalRecord = await ProposalsAsset.ProposalsById.call( ProposalId );
                let ProposalState = helpers.utils.getRecordStateNameById("Proposals", ProposalRecord[3].toNumber() );

                assert.equal(ProposalState, "ACCEPTING_VOTES", "Proposal state should be ACCEPTING_VOTES");

                // change from no to yes

                tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: usedWallet} );

                ProposalResultRecord = await ProposalsAsset.ResultsByProposalId.call( ProposalId );
                let totalSoFar = ProposalResultRecord[2];
                yesTotals = ProposalResultRecord[3];
                noTotals = ProposalResultRecord[4];
                let calcTotals = new helpers.BigNumber(0);
                calcTotals = calcTotals.add(yesTotals);
                calcTotals = calcTotals.add(noTotals);

                assert.equal( yesTotals.toString(), Power.toString(), "Totals should match voting power!");
                assert.equal( noTotals.toString(), 0, "No Totals should be 0!"  );
                assert.equal( totalSoFar.toString(), calcTotals.toString(), "calcTotals should match totalSoFar" );
            });



            it("While more than 1 proposal is active, properly re-indexes active proposals once one is closed", async () => {

                let usedWallet = wallet1;
                let Power = await ProposalsAsset.getVotingPower.call( ProposalId, usedWallet );

                let ProposalRec = await ProposalsAsset.ProposalsById.call(ProposalId);
                let proposalEndTime = ProposalRec[9].toNumber();
                tx = await TestBuildHelper.timeTravelTo(proposalEndTime - 3600);
                await TestBuildHelper.doApplicationStateChanges("1h before voting end", false);

                ApplicationEntity = await TestBuildHelper.getDeployedByName("ApplicationEntity");
                let app = await contracts.ApplicationEntity.new();
                let eventFilter = helpers.utils.hasEvent(
                    await ApplicationEntity.callTestAddCodeUpgradeProposal(await app.address, "url"),
                    'EventNewProposalCreated(bytes32,uint256)'
                );
                assert.equal(eventFilter.length, 1, 'EventNewProposalCreated event not received.');

                tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: usedWallet} );

                ProposalRec = await ProposalsAsset.ProposalsById.call(ProposalId);
                proposalEndTime = ProposalRec[9].toNumber();
                tx = await TestBuildHelper.timeTravelTo(proposalEndTime + 1);
                await TestBuildHelper.doApplicationStateChanges("Voting ended", false);

                let ProposalResultRecord = await ProposalsAsset.ResultsByProposalId.call( ProposalId );
                let yesTotals = ProposalResultRecord[3];

                assert.equal( yesTotals.toString(), Power.toString(), "Totals should match voting power!" );

                let ProposalRecord = await ProposalsAsset.ProposalsById.call( ProposalId );
                let ProposalState = helpers.utils.getRecordStateNameById("Proposals", ProposalRecord[3].toNumber() );

                assert.equal(ProposalState, "VOTING_RESULT_YES", "Proposal state should be VOTING_RESULT_YES");

                // number of registered proposals should be 2
                let RecordNum = await ProposalsAsset.RecordNum.call();
                assert.equal(RecordNum, 2, 'RecordNum does not match');

                let NumberOfActiveProposals = await ProposalsAsset.ActiveProposalNum.call();
                let ActiveProposalId = await ProposalsAsset.ActiveProposalIds.call(0);

                assert.equal(
                    NumberOfActiveProposals,
                    1,
                    'Active proposal number should be 1'
                );

                assert.equal(
                    ActiveProposalId,
                    2,
                    'Active Proposal record ID should be 2'
                );
            });

            context("Voting Successful - Voting time expired", async () => {

                it("FundingManagerAsset state processed, releases ether to owner, tokens to investors, validates balances", async () => {

                    tx = await ProposalsAsset.RegisterVote( ProposalId, true, {from: wallet4} );

                    // save platformWalletAddress initial balances
                    let tokenBalance = await TestBuildHelper.getTokenBalance( platformWalletAddress ) ;
                    let etherBalance = await helpers.utils.getBalance(helpers.artifacts, platformWalletAddress);
                    // total funding ether
                    let MilestoneAmountRaised = await FundingAsset.MilestoneAmountRaised.call();

                    // first milestone percent
                    let EmergencyAmount = MilestoneAmountRaised.div(100);
                    EmergencyAmount = EmergencyAmount.mul(settings.bylaws["emergency_fund_percentage"]);

                    let MilestoneAmountLeft = MilestoneAmountRaised.sub(EmergencyAmount);

                    let MilestoneOneAmount = MilestoneAmountLeft.div(100);
                    MilestoneOneAmount = MilestoneOneAmount.mul(settings.milestones[0].funding_percentage);

                    // save wallet1 state so we can validate after
                    let walletTokenBalance = await TestBuildHelper.getTokenBalance( wallet1 ) ;

                    let currentRecordId = await MilestonesAsset.currentRecord.call();

                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(ProposalId);
                    let proposalEndTime = ProposalRecord[9].toNumber();
                    await TestBuildHelper.timeTravelTo(proposalEndTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("MILESTONE_DEADLINE", false);

                    let tokenBalanceAfter = await TestBuildHelper.getTokenBalance( platformWalletAddress ) ;
                    let etherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, platformWalletAddress);

                    let initialPlusMilestone = etherBalance.add(MilestoneOneAmount);

                    assert.equal(tokenBalance.toString(), tokenBalanceAfter.toString(), "tokenBalances should match");
                    assert.equal(etherBalanceAfter.toString(), initialPlusMilestone.toString(), "etherBalanceAfter should match initialPlusMilestone ");

                    let walletTokenBalanceAfter = await TestBuildHelper.getTokenBalance( wallet1 ) ;
                    let vault = await TestBuildHelper.getMyVaultAddress(wallet1);
                    let vaultReleaseTokenBalance = await vault.tokenBalances.call(1);
                    let walletInitialPlusMilestone = walletTokenBalance.add(vaultReleaseTokenBalance);

                    assert.equal(walletTokenBalanceAfter.toString(), walletInitialPlusMilestone.toString(), "walletTokenBalanceAfter should match walletInitialPlusMilestone ");

                    let currentRecordIdAfter = await MilestonesAsset.currentRecord.call();
                    let currentRecordIdCheck = currentRecordId.add(1);

                    assert.equal(currentRecordIdCheck.toString(), currentRecordIdAfter.toString(), "currentRecordIdAfter should match currentRecordId + 1 ");
                });

            });


        });

    });

};