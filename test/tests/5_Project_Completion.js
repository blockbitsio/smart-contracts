module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];

    let snapshotsEnabled = true;
    let snapshots = [];

    contract('Project COMPLETION', accounts => {
        let tx, TestBuildHelper, FundingInputDirect, FundingInputMilestone, ProposalsAsset,
            MilestonesAsset, ApplicationEntity, beforeProposalRequiredStateChanges, FundingAsset, FundingManagerAsset,
            TokenManagerAsset, TokenEntity, validation = {};

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


        it("Development started, processes all milestones, and after last one sets application into DEVELOPMENT_COMPLETE state, validates balances each step", async () => {

            let ProposalId = 0;
            let MilestoneNum = await MilestonesAsset.RecordNum.call();

            for(let i = 1; i <= MilestoneNum.toNumber(); i++ ) {

                // console.log("Processing milestone id: ", i);
                // await TestBuildHelper.displayAllVaultDetails();

                // >>> initial values
                // save platformWalletAddress initial balances
                let tokenBalance = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let etherBalance = await helpers.utils.getBalance(helpers.artifacts, platformWalletAddress);

                let etherBalanceInFull = helpers.web3util.fromWei(etherBalance, "ether");

                // total funding ether
                let MilestoneAmountRaised = await FundingAsset.MilestoneAmountRaised.call();
                // first milestone percent
                let EmergencyAmount = MilestoneAmountRaised.div(100);
                EmergencyAmount = EmergencyAmount.mul(settings.bylaws["emergency_fund_percentage"]);
                let MilestoneAmountLeft = MilestoneAmountRaised.sub(EmergencyAmount);
                let MilestoneActualAmount = MilestoneAmountLeft.div(100);
                MilestoneActualAmount = MilestoneActualAmount.mul(settings.milestones[(i-1)].funding_percentage);


                // save wallet1 state so we can validate after
                let walletTokenBalance = await TestBuildHelper.getTokenBalance(wallet1);
                let currentRecordId = await MilestonesAsset.currentRecord.call();
                // <<<

                // time travel to start of milestone
                let start_time;
                if(i === 1) {
                    start_time = settings.bylaws["development_start"] + 1;
                } else {
                    let MilestoneRecord = await MilestonesAsset.Collection.call(currentRecordId);
                    start_time = MilestoneRecord[4].add(1);
                }

                await TestBuildHelper.timeTravelTo( start_time );

                let currentTime = await MilestonesAsset.getTimestamp.call();
                // set meeting time 10 days from now.
                let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600);

                await MilestonesAsset.setCurrentMilestoneMeetingTime(meetingTime);

                await TestBuildHelper.doApplicationStateChanges("RegisterVote", false);

                // console.log( await helpers.utils.showAllStates(helpers, TestBuildHelper));

                tx = await TestBuildHelper.timeTravelTo(meetingTime + 1);

                await TestBuildHelper.doApplicationStateChanges("timeTravelTo", false);

                // Milestone Release Proposal should exist here
                // increment proposal id
                ProposalId++;
                // await helpers.utils.displayProposal(helpers, ProposalsAsset, ProposalId);

                // vote yes
                tx = await ProposalsAsset.RegisterVote(ProposalId, true, {from: wallet1});

                // time travel to end of proposal
                let ProposalRecord = await ProposalsAsset.ProposalsById.call(ProposalId);
                let proposalEndTime = ProposalRecord[9].toNumber();
                tx = await TestBuildHelper.timeTravelTo(proposalEndTime + 1);
                await TestBuildHelper.doApplicationStateChanges("Voting ended", false);
                // await helpers.utils.displayProposal(helpers, ProposalsAsset, ProposalId);

                // >>> new values, validation
                let etherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, platformWalletAddress);

                if(i === MilestoneNum.toNumber()) {

                    // Validate Ending Ether Balances - Owner
                    let MilestoneAmountRaised = await FundingAsset.MilestoneAmountRaised.call();
                    let EmergencyAmount = MilestoneAmountRaised.div(100);
                    EmergencyAmount = EmergencyAmount.mul(settings.bylaws["emergency_fund_percentage"]);
                    let initialPlusMilestoneAndEmergency = etherBalance.add(EmergencyAmount);
                    initialPlusMilestoneAndEmergency = initialPlusMilestoneAndEmergency.add(MilestoneActualAmount);
                    assert.equal(etherBalanceAfter.toString(), initialPlusMilestoneAndEmergency.toString(), "etherBalanceAfter should match initialPlusMilestoneAndEmergency ");



                    let FundingBountyTokenPercentage = settings.bylaws["token_bounty_percentage"];
                    let BountySupply = settings.token.supply.div( 100 );
                    BountySupply = BountySupply.mul( FundingBountyTokenPercentage );
                    let actualTokenSupply = settings.token.supply;
                    actualTokenSupply = actualTokenSupply.sub( BountySupply );

                    // Validate Ending Token Balances - Owner
                    let tokenBalanceAfter = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                    let perc = settings.bylaws["token_sale_percentage"];
                    let supply = actualTokenSupply;
                    let saleTotal = supply.mul( perc );
                    saleTotal = saleTotal.div( 100 );
                    let ownerSupply = new helpers.BigNumber(supply);
                    ownerSupply = ownerSupply.sub( saleTotal );

                    // remove 1 full token from owner supply, as it's in the FundingManager
                    ownerSupply = ownerSupply.sub( 1 * helpers.solidity.ether );

                    assert.equal(ownerSupply.toString(), tokenBalanceAfter.toString(), "tokenBalances should match");

                    // Validate Ending Token Balances - Investor
                    let walletTokenBalanceAfter = await TestBuildHelper.getTokenBalance(wallet1);
                    let vault = await TestBuildHelper.getMyVaultAddress(wallet1);
                    let vaultReleaseTokenMilestoneBalance = await vault.tokenBalances.call( MilestoneNum.toNumber() );
                    let vaultReleaseTokenEmergencyBalance = await vault.tokenBalances.call( 0 );
                    let walletInitialPlusMilestoneAndEmergency = walletTokenBalance.add(vaultReleaseTokenMilestoneBalance);
                    walletInitialPlusMilestoneAndEmergency = walletInitialPlusMilestoneAndEmergency.add(vaultReleaseTokenEmergencyBalance);
                    assert.equal(walletTokenBalanceAfter.toString(), walletInitialPlusMilestoneAndEmergency.toString(), "walletTokenBalanceAfter should match walletInitialPlusMilestoneAndEmergency ");

                } else {

                    let initialPlusMilestone = etherBalance.add(MilestoneActualAmount);
                    assert.equal(etherBalanceAfter.toString(), initialPlusMilestone.toString(), "etherBalanceAfter should match initialPlusMilestone ");

                    let currentRecordIdCheck = currentRecordId.add(1);
                    let currentRecordIdAfter = await MilestonesAsset.currentRecord.call();
                    assert.equal(currentRecordIdCheck.toString(), currentRecordIdAfter.toString(), "currentRecordIdAfter should match currentRecordId + 1 ");

                    let walletTokenBalanceAfter = await TestBuildHelper.getTokenBalance(wallet1);
                    let vault = await TestBuildHelper.getMyVaultAddress(wallet1);
                    let vaultReleaseTokenBalance = await vault.tokenBalances.call( currentRecordIdAfter );
                    let walletInitialPlusMilestone = walletTokenBalance.add(vaultReleaseTokenBalance);
                    assert.equal(walletTokenBalanceAfter.toString(), walletInitialPlusMilestone.toString(), "walletTokenBalanceAfter should match walletInitialPlusMilestone ");

                }
                // <<<
            }

            // end, coverage
            tx = await ApplicationEntity.doStateChanges();

            let appState = await ApplicationEntity.CurrentEntityState.call();
            let appStateCode = helpers.utils.getEntityStateIdByName("ApplicationEntity", "DEVELOPMENT_COMPLETE");
            assert.equal(appState.toString(), appStateCode, "ApplicationEntity state should be DEVELOPMENT_COMPLETE");


        });


    });

};