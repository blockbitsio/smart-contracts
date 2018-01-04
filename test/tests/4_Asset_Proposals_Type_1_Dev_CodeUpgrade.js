module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];

    let snapshotsEnabled = true;
    let snapshots = [];

    contract('Proposals Asset - Type 1 - IN_DEVELOPMENT_CODE_UPGRADE', accounts => {
        let tx, TestBuildHelper, TestBuildHelperUpgrade, FundingInputDirect, FundingInputMilestone, ProposalsAsset,
            MilestonesAsset, ApplicationEntity, beforeProposalRequiredStateChanges, FundingManagerAsset,
            TokenManagerAsset, TokenEntity, validation, GatewayInterface = {};

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

                // create snapshot
                if (snapshotsEnabled) {
                    snapshots[SnapShotKey] = await helpers.web3.evm.snapshot();
                }
            }

            ProposalsAsset = await TestBuildHelper.getDeployedByName("Proposals");
            beforeProposalRequiredStateChanges = await ProposalsAsset.hasRequiredStateChanges.call();

            GatewayInterface = await TestBuildHelper.getDeployedByName("GatewayInterface");
            ApplicationEntity = await TestBuildHelper.getDeployedByName("ApplicationEntity");
            MilestonesAsset = await TestBuildHelper.getDeployedByName("Milestones");
            ProposalsAsset = await TestBuildHelper.getDeployedByName("Proposals");
            FundingManagerAsset = await TestBuildHelper.getDeployedByName("FundingManager");
            TokenManagerAsset = await TestBuildHelper.getDeployedByName("TokenManager");

            let TokenEntityAddress = await TokenManagerAsset.TokenEntity.call();
            let TokenEntityContract = await helpers.getContract("TestToken");
            TokenEntity = await TokenEntityContract.at(TokenEntityAddress);
        });


        it( "current proposal matches IN_DEVELOPMENT_CODE_UPGRADE settings", async () => {

             // time travel to development start
             await TestBuildHelper.timeTravelTo(settings.bylaws["development_start"] + 1);
             await TestBuildHelper.doApplicationStateChanges("Development Started", false);

            TestBuildHelperUpgrade = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
            await TestBuildHelperUpgrade.deployUpgradeApplication( GatewayInterface.address, TestBuildHelper );

            // displayProposal(helpers, ProposalsAsset, ProposalId)
            // await TestBuildHelper.showApplicationStates();

            let RecordNum = await ProposalsAsset.RecordNum.call();
            assert.equal(RecordNum.toNumber(), 1, 'RecordNum does not match');

            let ProposalRecord = await ProposalsAsset.ProposalsById.call(1);
            assert.equal(
                ProposalRecord[2].toString(),
                helpers.utils.getActionIdByName("Proposals", "IN_DEVELOPMENT_CODE_UPGRADE").toString(),
                'Proposal record type does not match'
            );

            assert.equal(
                ProposalRecord[3].toString(),
                helpers.utils.getRecordStateIdByName("Proposals", "ACCEPTING_VOTES").toString(),
                'Proposal record type does not match'
            );

            let ResultRecord = await ProposalsAsset.ResultsByProposalId.call(1);

            // IN_DEVELOPMENT_CODE_UPGRADE is only voted by "locked" tokens
            assert.isFalse(ResultRecord[5], "Vote Recounting should be false.");

        });


        it( "proposal closes as VOTING_RESULT_YES when time expires and no votes are registered", async () => {

             // time travel to development start
             await TestBuildHelper.timeTravelTo(settings.bylaws["development_start"] + 1);
             await TestBuildHelper.doApplicationStateChanges("Development Started", false);

             TestBuildHelperUpgrade = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
             await TestBuildHelperUpgrade.deployUpgradeApplication( GatewayInterface.address, TestBuildHelper );

            // time travel to end of proposal
            let ProposalRecord = await ProposalsAsset.ProposalsById.call(1);
            let proposalEndTime = ProposalRecord[9].toNumber();
            tx = await TestBuildHelper.timeTravelTo(proposalEndTime + 1);
            await TestBuildHelper.doApplicationStateChanges("Voting ended", false);


            ProposalRecord = await ProposalsAsset.ProposalsById.call(1);
            assert.equal(
                ProposalRecord[2].toString(),
                helpers.utils.getActionIdByName("Proposals", "IN_DEVELOPMENT_CODE_UPGRADE").toString(),
                'Proposal record type does not match'
            );

            assert.equal(
                ProposalRecord[3].toString(),
                helpers.utils.getRecordStateIdByName("Proposals", "VOTING_RESULT_YES").toString(),
                'Proposal record type does not match'
            );
        });



        it( "second application has all assets added, and more. Proposal closes as VOTING_RESULT_YES, state change results in assets getting transferred.", async () => {

             // time travel to development start
             await TestBuildHelper.timeTravelTo(settings.bylaws["development_start"] + 1);
             await TestBuildHelper.doApplicationStateChanges("Development Started", false);

             TestBuildHelperUpgrade = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
             await TestBuildHelperUpgrade.deployUpgradeApplication( GatewayInterface.address, TestBuildHelper );

            // displayProposal(helpers, ProposalsAsset, ProposalId)
            // await TestBuildHelper.showApplicationStates();

            let ApplicationEntity = await TestBuildHelper.getDeployedByName("ApplicationEntity");
            let ApplicationEntityUpgrade = await TestBuildHelperUpgrade.getDeployedByName("ApplicationEntity");

            let gwAppAddrBefore = await GatewayInterface.currentApplicationEntityAddress.call();

            assert.equal(gwAppAddrBefore, ApplicationEntity.address, 'ApplicationEntity address does not match');

            let ApplicationEntityLocked = await ApplicationEntityUpgrade._locked.call();
            assert.isFalse(ApplicationEntityLocked, 'ApplicationEntity should not be locked');

            let ApplicationEntityUpgradeLocked = await ApplicationEntity._locked.call();
            assert.isFalse(ApplicationEntityUpgradeLocked, 'ApplicationEntityUpgrade should not be locked');


            // check deployed asset address
            for (let i = 0; i < setup.assetContractNames.length; i++) {
                let name = setup.assetContractNames[i];
                let deployedInOld = await TestBuildHelper.getDeployedByName(name);
                let deployedInNew = await ApplicationEntityUpgrade.getAssetAddressByName.call(name);
                assert.equal(deployedInOld.address, deployedInNew.toString(), 'Asset address does not match');
            }

            // await TestBuildHelper.showApplicationStates();

            // vote for accepting the upgrade
            await ProposalsAsset.RegisterVote( 1, true, {from: wallet1} );

            // await helpers.utils.displayProposal(helpers, ProposalsAsset, 1) ;

            // end proposal
            let ProposalRecord = await ProposalsAsset.ProposalsById.call(1);
            let proposalEndTime = ProposalRecord[9].toNumber();
            tx = await TestBuildHelper.timeTravelTo(proposalEndTime + 1);
            tx = await TestBuildHelperUpgrade.timeTravelTo(proposalEndTime + 1);

            // await TestBuildHelper.showApplicationStates();
            // await TestBuildHelperUpgrade.showApplicationStates();

            await TestBuildHelperUpgrade.doApplicationStateChanges("Voting ended", false);

            await TestBuildHelperUpgrade.addSettingsAndLockOnNewAssetsInApplication();

            let gwAppAddrAfter = await GatewayInterface.currentApplicationEntityAddress.call();
            assert.equal(gwAppAddrAfter, ApplicationEntityUpgrade.address, 'ApplicationEntityUpgrade address does not match');

            ApplicationEntityLocked = await ApplicationEntity._locked.call();
            assert.isTrue(ApplicationEntityLocked, 'ApplicationEntity should be locked');

            ApplicationEntityUpgradeLocked = await ApplicationEntityUpgrade._locked.call();
            assert.isFalse(ApplicationEntityUpgradeLocked, 'ApplicationEntityUpgrade should not be locked');

        });

        it("VOTE NO @ Milestone 3 - Proposal processed. Investor uses CashBack, validate balances, can continue with next milestones", async () => {

            let investor1wallet = wallet1;
            let ProposalId = 0;
            let MilestoneNum = await MilestonesAsset.RecordNum.call();
            let tx;

            for(let i = 1; i <= 2; i++ ) {

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
            }


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

            ProposalId++;

            let MilestoneId = await MilestonesAsset.currentRecord.call();
            assert.equal(MilestoneId.toString(), 3, "MilestoneId should be 3");

            let MilestoneRecord = await MilestonesAsset.Collection.call( MilestoneId );

            let currentTime = await MilestonesAsset.getTimestamp.call();
            // set meeting time 10 days from now.
            let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600 );
            await MilestonesAsset.setCurrentMilestoneMeetingTime(meetingTime);
            tx = await TestBuildHelperUpgrade.timeTravelTo(meetingTime + 1);
            await TestBuildHelperUpgrade.doApplicationStateChanges("At Milestone Release Voting", false);

            tx = await ProposalsAsset.RegisterVote(ProposalId, false, {from: investor1wallet});

            // time travel to end of proposal
            ProposalRecord = await ProposalsAsset.ProposalsById.call(ProposalId);
            proposalEndTime = ProposalRecord[9].toNumber();
            tx = await TestBuildHelperUpgrade.timeTravelTo(proposalEndTime + 1);
            await TestBuildHelperUpgrade.doApplicationStateChanges("Voting ended", false);

            let vault = await TestBuildHelperUpgrade.getMyVaultAddress(investor1wallet);
            let canCashBack = await vault.canCashBack.call();
            let checkMilestoneStateInvestorVotedNoVotingEndedNo = await vault.checkMilestoneStateInvestorVotedNoVotingEndedNo.call();
            assert.isTrue(canCashBack, "Should be able to CashBack");
            assert.isTrue(checkMilestoneStateInvestorVotedNoVotingEndedNo, "checkMilestoneStateInvestorVotedNoVotingEndedNo should be true");

            // vault 4 has locked tokens, but should not be allowed to cash back since they did not vote NO
            vault = await TestBuildHelperUpgrade.getMyVaultAddress(wallet4);
            canCashBack = await vault.canCashBack.call();
            checkMilestoneStateInvestorVotedNoVotingEndedNo = await vault.checkMilestoneStateInvestorVotedNoVotingEndedNo.call();
            assert.isFalse(canCashBack, "Should not be able to CashBack");
            assert.isFalse(checkMilestoneStateInvestorVotedNoVotingEndedNo, "checkMilestoneStateInvestorVotedNoVotingEndedNo should be false");

            // cashback validated
            // now do it

            let platformTokenBalanceInitial = await TestBuildHelperUpgrade.getTokenBalance(platformWalletAddress);
            let FMLockedTokensInitial = await FundingManagerAsset.LockedVotingTokens.call();
            vault = await TestBuildHelperUpgrade.getMyVaultAddress(investor1wallet);
            let EtherBalanceInitial = await helpers.utils.getBalance(helpers.artifacts, investor1wallet);
            let EtherBalanceLeft = await helpers.utils.getBalance(helpers.artifacts, vault.address);
            let vaultTokenBalanceInitial = await TestBuildHelperUpgrade.getTokenBalance(vault.address);

            // since the investor calls this, we need to take GasUsage into account.
            tx = await vault.ReleaseFundsToInvestor({from: investor1wallet});
            let gasUsed = new helpers.BigNumber( tx.receipt.cumulativeGasUsed );
            let gasPrice = await helpers.utils.getGasPrice(helpers);
            let gasDifference = gasUsed.mul(gasPrice);

            // validate investor ether balances
            let EtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, investor1wallet);
            let EtherBalanceInitialPlusLeft = EtherBalanceInitial.add(EtherBalanceLeft);
            // sub used gas from initial
            EtherBalanceInitialPlusLeft = EtherBalanceInitialPlusLeft.sub(gasDifference);
            assert.equal(EtherBalanceAfter.toString(), EtherBalanceInitialPlusLeft.toString(), "EtherBalanceAfter should match EtherBalanceInitialPlusContributed");

            // validate Funding Manager Locked Token value
            let FMLockedTokensAfter = await FundingManagerAsset.LockedVotingTokens.call();
            let FMLockedTokensValidate = await FMLockedTokensAfter.add(vaultTokenBalanceInitial);
            assert.equal(FMLockedTokensInitial.toString(), FMLockedTokensValidate.toString(), "Funding Manager Locked Token value does not match");

            // validate platform owner wallet new token balances
            let platformTokenBalanceAfter = await TestBuildHelperUpgrade.getTokenBalance(platformWalletAddress);
            let platformTokenBalanceValidate = await platformTokenBalanceInitial.add( vaultTokenBalanceInitial );
            assert.equal(platformTokenBalanceAfter.toString(), platformTokenBalanceValidate.toString(), "Platform Owner wallet token balance does not match");

            // validate vault balances, all should be 0
            let VaultEtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, vault.address);
            assert.equal(VaultEtherBalanceAfter.toString(), 0, "VaultEtherBalanceAfter should be 0");
            let vaultTokenBalanceAfter = await TestBuildHelperUpgrade.getTokenBalance(vault.address);
            assert.equal(vaultTokenBalanceAfter.toString(), 0, "vaultTokenBalanceAfter should be 0");


            // continue
            currentTime = await MilestonesAsset.getTimestamp.call();
            let cashback_duration = await MilestonesAsset.getBylawsCashBackVoteRejectedDuration.call();
            let after_cashback = currentTime.add(cashback_duration);
            tx = await TestBuildHelperUpgrade.timeTravelTo(after_cashback.add(1));
            await TestBuildHelperUpgrade.doApplicationStateChanges("after cashback", false);

            for(let i = MilestoneId; i < MilestoneNum; i++ ) {


                let MilestoneId = await MilestonesAsset.currentRecord.call();
                let MilestoneRecord = await MilestonesAsset.Collection.call( MilestoneId );

                // time travel to start of milestone
                let start_time = MilestoneRecord[4].add(1);

                await TestBuildHelperUpgrade.timeTravelTo(start_time);
                let currentTime = await MilestonesAsset.getTimestamp.call();
                // set meeting time 10 days from now.
                let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600 );

                await MilestonesAsset.setCurrentMilestoneMeetingTime(meetingTime);
                await TestBuildHelperUpgrade.doApplicationStateChanges("Set Meeting Time", false);

                tx = await TestBuildHelperUpgrade.timeTravelTo(meetingTime + 1);
                await TestBuildHelperUpgrade.doApplicationStateChanges("At Meeting Time", false);

                ProposalId++;
                tx = await ProposalsAsset.RegisterVote(ProposalId, true, {from: wallet4});

                // time travel to end of proposal
                let ProposalRecord = await ProposalsAsset.ProposalsById.call(ProposalId);
                let proposalEndTime = ProposalRecord[9].toNumber();
                tx = await TestBuildHelperUpgrade.timeTravelTo(proposalEndTime + 1);
                await TestBuildHelperUpgrade.doApplicationStateChanges("Voting ended", false);

                if(MilestoneId === 5) {
                    break;
                }
            }

            // old app remains as UPGRADED
            let appState = await ApplicationEntity.CurrentEntityState.call();
            let appStateCode = helpers.utils.getEntityStateIdByName("ApplicationEntity", "UPGRADED");
            assert.equal(appState.toString(), appStateCode, "ApplicationEntity state should be UPGRADED");

            // New app is DEVELOPMENT_COMPLETE
            ApplicationEntity = await TestBuildHelperUpgrade.getDeployedByName("ApplicationEntity");
            appState = await ApplicationEntity.CurrentEntityState.call();
            appStateCode = helpers.utils.getEntityStateIdByName("ApplicationEntity", "DEVELOPMENT_COMPLETE");
            assert.equal(appState.toString(), appStateCode, "ApplicationEntity state should be DEVELOPMENT_COMPLETE");
        });

    });
};