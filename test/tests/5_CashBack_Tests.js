module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];

    let snapshotsEnabled = true;
    let snapshots = [];

    contract('CashBack Scenario Testing', accounts => {
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

        // await helpers.utils.displayCashBackStatus(helpers, TestBuildHelper, investor1wallet);


        context("Platform Funding Failed - Cashback Type 1 - Funding processed", async () => {

            let investor1wallet = wallet1;
            let investor1amount = 1 * helpers.solidity.ether;
            let investor2wallet = wallet2;
            let investor2amount = 1 * helpers.solidity.ether;

            beforeEach(async () => {
                await FundingInputMilestone.sendTransaction({
                    value: investor1amount,
                    from: investor1wallet
                });

                await FundingInputDirect.sendTransaction({
                    value: investor2amount,
                    from: investor2wallet
                });

                // time travel to end of ICO, and change states
                await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                await TestBuildHelper.doApplicationStateChanges("Funding End", false);

            });

            it("Funding Vaults allow all investors to CashBack", async () => {

                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let canCashBack = await vault.canCashBack.call();
                let checkFundingStateFailed = await vault.checkFundingStateFailed.call();

                assert.isTrue(canCashBack, "Should be able to CashBack");
                assert.isTrue(checkFundingStateFailed, "checkFundingStateFailed should be true");

                vault = await TestBuildHelper.getMyVaultAddress(investor2wallet);
                canCashBack = await vault.canCashBack.call();
                checkFundingStateFailed = await vault.checkFundingStateFailed.call();

                assert.isTrue(canCashBack, "Should be able to CashBack");
                assert.isTrue(checkFundingStateFailed, "checkFundingStateFailed should be true");
            });

            it("throws if CashBack is requested by other address than vault owner (investor)", async () => {
                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let checkFundingStateFailed = await vault.checkFundingStateFailed.call();
                assert.isTrue(checkFundingStateFailed, "checkFundingStateFailed should be true");

                return helpers.assertInvalidOpcode(async () => {
                    await vault.ReleaseFundsToInvestor({from: accounts[0]})
                });
            });

            it("Requesting CashBack transfers all locked ether back to the investor, validates balances and gas usage", async () => {

                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let EtherBalanceInitial = await helpers.utils.getBalance(helpers.artifacts, investor1wallet);

                // since the investor calls this, we need to take GasUsage into account.
                let tx = await vault.ReleaseFundsToInvestor({from: investor1wallet});
                let gasUsed = new helpers.BigNumber( tx.receipt.cumulativeGasUsed );
                let gasPrice = await helpers.utils.getGasPrice(helpers);
                let gasDifference = gasUsed.mul(gasPrice);

                // validate investor ether balances
                let EtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, investor1wallet);
                let EtherBalanceInitialPlusContributed = EtherBalanceInitial.add(investor1amount);
                // sub used gas from initial
                EtherBalanceInitialPlusContributed = EtherBalanceInitialPlusContributed.sub(gasDifference);
                assert.equal(EtherBalanceAfter.toString(), EtherBalanceInitialPlusContributed.toString(), "EtherBalanceAfter should match EtherBalanceInitialPlusContributed");

                // validate vault balances, all should be 0
                let VaultEtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, vault.address);
                assert.equal(VaultEtherBalanceAfter.toString(), 0, "VaultEtherBalanceAfter should be 0");
            });

        });



        context("Platform Funding Failed - Cashback Type 1 - Funding not processed", async () => {

            let investor1wallet = wallet1;
            let investor1amount = 5000 * helpers.solidity.ether;
            let investor2wallet = wallet2;
            let investor2amount = 5000 * helpers.solidity.ether;

            beforeEach(async () => {
                await FundingInputMilestone.sendTransaction({
                    value: investor1amount,
                    from: investor1wallet
                });

                await FundingInputDirect.sendTransaction({
                    value: investor2amount,
                    from: investor2wallet
                });

                // time travel to end of ICO, and change states
                await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);

                // don't change states, we're checking if cashback works when states are not processed.
                // await TestBuildHelper.doApplicationStateChanges("Funding End", false);
                await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1 + ( 7 * 24 * 3600 ) );

            });

            it("Funding Vaults allow all investors to CashBack", async () => {

                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let canCashBack = await vault.canCashBack.call();
                let checkFundingStateFailed = await vault.checkFundingStateFailed.call();

                assert.isTrue(canCashBack, "Should be able to CashBack");
                assert.isTrue(checkFundingStateFailed, "checkFundingStateFailed should be true");

                vault = await TestBuildHelper.getMyVaultAddress(investor2wallet);
                canCashBack = await vault.canCashBack.call();
                checkFundingStateFailed = await vault.checkFundingStateFailed.call();

                assert.isTrue(canCashBack, "Should be able to CashBack");
                assert.isTrue(checkFundingStateFailed, "checkFundingStateFailed should be true");
            });

            it("throws if CashBack is requested by other address than vault owner (investor)", async () => {
                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let checkFundingStateFailed = await vault.checkFundingStateFailed.call();
                assert.isTrue(checkFundingStateFailed, "checkFundingStateFailed should be true");

                return helpers.assertInvalidOpcode(async () => {
                    await vault.ReleaseFundsToInvestor({from: accounts[0]})
                });
            });

            it("Requesting CashBack transfers all locked ether back to the investor, validates balances and gas usage", async () => {

                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let EtherBalanceInitial = await helpers.utils.getBalance(helpers.artifacts, investor1wallet);

                // since the investor calls this, we need to take GasUsage into account.
                let tx = await vault.ReleaseFundsToInvestor({from: investor1wallet});
                let gasUsed = new helpers.BigNumber( tx.receipt.cumulativeGasUsed );
                let gasPrice = await helpers.utils.getGasPrice(helpers);
                let gasDifference = gasUsed.mul(gasPrice);

                // validate investor ether balances
                let EtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, investor1wallet);
                let EtherBalanceInitialPlusContributed = EtherBalanceInitial.add(investor1amount);
                // sub used gas from initial
                EtherBalanceInitialPlusContributed = EtherBalanceInitialPlusContributed.sub(gasDifference);
                assert.equal(EtherBalanceAfter.toString(), EtherBalanceInitialPlusContributed.toString(), "EtherBalanceAfter should match EtherBalanceInitialPlusContributed");

                // validate vault balances, all should be 0
                let VaultEtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, vault.address);
                assert.equal(VaultEtherBalanceAfter.toString(), 0, "VaultEtherBalanceAfter should be 0");
            });

            it("Once processed Funding Vaults do not allow CashBack", async () => {

                // time is before cashback and processing is done, cashback cannot be initiated
                await TestBuildHelper.timeTravelTo(ico_settings.end_time + ( 7 * 24 * 3600 ) - 1 );
                await TestBuildHelper.doApplicationStateChanges("Funding End", false);

                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let canCashBack = await vault.canCashBack.call();
                let checkFundingStateFailed = await vault.checkFundingStateFailed.call();

                assert.isFalse(canCashBack, "Should not be able to CashBack");
                assert.isFalse(checkFundingStateFailed, "checkFundingStateFailed should be false");

                vault = await TestBuildHelper.getMyVaultAddress(investor2wallet);
                canCashBack = await vault.canCashBack.call();
                checkFundingStateFailed = await vault.checkFundingStateFailed.call();

                assert.isFalse(canCashBack, "Should not be able to CashBack");
                assert.isFalse(checkFundingStateFailed, "checkFundingStateFailed should be false");
            });

            it("If not processed in time, and CashBack is active, throws if trying to process", async () => {
                // time is before cashback and processing is done, cashback cannot be initiated
                await TestBuildHelper.timeTravelTo(ico_settings.end_time + ( 7 * 24 * 3600 ) + 1 );

                return helpers.assertInvalidOpcode(async () => {
                    await TestBuildHelper.doApplicationStateChanges("Funding End", false);
                });
            });

        });

        context("Platform Funding Successful - Cashback Type 2 - Owner Missing in Action Cashback", async () => {

            let investor1wallet = wallet1;
            let investor1amount = 5000 * helpers.solidity.ether;
            let investor2wallet = wallet2;
            let investor2amount = 5000 * helpers.solidity.ether;
            let investor3wallet = wallet3;
            let investor3amount = 10000 * helpers.solidity.ether;
            let investor4wallet = wallet4;
            let investor4amount = 10000 * helpers.solidity.ether;

            let end_time, start_time;

            beforeEach(async () => {
                await FundingInputMilestone.sendTransaction({
                    value: investor1amount,
                    from: investor1wallet
                });

                await FundingInputDirect.sendTransaction({
                    value: investor2amount,
                    from: investor2wallet
                });

                // time travel to start of ICO, and change states
                await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                await TestBuildHelper.doApplicationStateChanges("After ICO START", false);

                await FundingInputDirect.sendTransaction({
                    value: investor3amount,
                    from: investor3wallet
                });

                await FundingInputMilestone.sendTransaction({
                    value: investor4amount,
                    from: investor4wallet
                });

                // time travel to end of ICO, and change states
                await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                await TestBuildHelper.doApplicationStateChanges("Funding End", false);

                // time travel to development start
                await TestBuildHelper.timeTravelTo(settings.bylaws["development_start"] + 1);
                await TestBuildHelper.doApplicationStateChanges("Development Started", false);

                let MilestoneId = await MilestonesAsset.currentRecord.call();
                let MilestoneRecord = await MilestonesAsset.Collection.call(MilestoneId);
                start_time = settings.bylaws["development_start"] + 1;
                // let start_time = MilestoneRecord[6];
                end_time = MilestoneRecord[6];

            });

            it("Funding Vaults allow all investors to CashBack", async () => {

                tx = await TestBuildHelper.timeTravelTo(end_time);
                await TestBuildHelper.doApplicationStateChanges("Owner MIA", false);

                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let canCashBack = await vault.canCashBack.call();
                let checkOwnerFailedToSetTimeOnMeeting  = await vault.checkOwnerFailedToSetTimeOnMeeting.call();
                assert.isTrue(canCashBack, "Should be able to CashBack");
                assert.isTrue(checkOwnerFailedToSetTimeOnMeeting, "checkOwnerFailedToSetTimeOnMeeting should be able true");

                // vault 2 used direct funding, so balances should be empty, but since we want to allow people to retrieve
                // black hole ether sent to vaults, we allow cashback
                vault = await TestBuildHelper.getMyVaultAddress(investor2wallet);
                canCashBack = await vault.canCashBack.call();
                checkOwnerFailedToSetTimeOnMeeting = await vault.checkOwnerFailedToSetTimeOnMeeting.call();
                assert.isTrue(canCashBack, "Should be able to CashBack");
                assert.isTrue(checkOwnerFailedToSetTimeOnMeeting, "checkOwnerFailedToSetTimeOnMeeting should be able true");
            });


            it("MIA @ Milestone 1 - Requesting CashBack transfers all locked ether back to the investor, and locked tokens to platform owner, validates balances and gas usage", async () => {

                await TestBuildHelper.timeTravelTo(end_time);
                await TestBuildHelper.doApplicationStateChanges("Owner MIA", false);

                let platformTokenBalanceInitial = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let FMLockedTokensInitial = await FundingManagerAsset.LockedVotingTokens.call();

                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let EtherBalanceInitial = await helpers.utils.getBalance(helpers.artifacts, investor1wallet);
                let vaultTokenBalanceInitial = await TestBuildHelper.getTokenBalance(vault.address);

                // since the investor calls this, we need to take GasUsage into account.
                let tx = await vault.ReleaseFundsToInvestor({from: investor1wallet});
                let gasUsed = new helpers.BigNumber( tx.receipt.cumulativeGasUsed );
                let gasPrice = await helpers.utils.getGasPrice(helpers);
                let gasDifference = gasUsed.mul(gasPrice);

                // validate investor ether balances
                let EtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, investor1wallet);
                let EtherBalanceInitialPlusContributed = EtherBalanceInitial.add(investor1amount);
                // sub used gas from initial
                EtherBalanceInitialPlusContributed = EtherBalanceInitialPlusContributed.sub(gasDifference);
                assert.equal(EtherBalanceAfter.toString(), EtherBalanceInitialPlusContributed.toString(), "EtherBalanceAfter should match EtherBalanceInitialPlusContributed");

                // validate Funding Manager Locked Token value
                let FMLockedTokensAfter = await FundingManagerAsset.LockedVotingTokens.call();
                let FMLockedTokensValidate = await FMLockedTokensAfter.add(vaultTokenBalanceInitial);
                assert.equal(FMLockedTokensInitial.toString(), FMLockedTokensValidate.toString(), "Funding Manager Locked Token value does not match");

                // validate platform owner wallet new token balances
                let platformTokenBalanceAfter = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let platformTokenBalanceValidate = await platformTokenBalanceInitial.add( vaultTokenBalanceInitial );
                assert.equal(platformTokenBalanceAfter.toString(), platformTokenBalanceValidate.toString(), "Platform Owner wallet token balance does not match");

                // validate vault balances, all should be 0
                let VaultEtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, vault.address);
                assert.equal(VaultEtherBalanceAfter.toString(), 0, "VaultEtherBalanceAfter should be 0");
                let vaultTokenBalanceAfter = await TestBuildHelper.getTokenBalance(vault.address);
                assert.equal(vaultTokenBalanceAfter.toString(), 0, "vaultTokenBalanceAfter should be 0");
            });

            it("MIA @ Milestone 3 - CashBack transfers all locked ether back to the investor, and locked tokens to platform owner, validates balances and gas usage", async () => {

                let ProposalId = 0;
                let MilestoneNum = await MilestonesAsset.RecordNum.call();
                let tx;

                for(let i = 1; i < 3; i++ ) {

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

                    let currentTime = await MilestonesAsset.getTimestamp.call();
                    // set meeting time 10 days from now.
                    let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600 );
                    await MilestonesAsset.setCurrentMilestoneMeetingTime(meetingTime);
                    await TestBuildHelper.doApplicationStateChanges("Set Meeting Time", false);

                    tx = await TestBuildHelper.timeTravelTo(meetingTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("At Meeting Time", false);
                    ProposalId++;

                    // vote yes
                    tx = await ProposalsAsset.RegisterVote(ProposalId, true, {from: investor1wallet});

                    // time travel to end of proposal
                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(ProposalId);
                    let proposalEndTime = ProposalRecord[9].toNumber();
                    tx = await TestBuildHelper.timeTravelTo(proposalEndTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("Voting ended", false);
                    // await helpers.utils.displayProposal(helpers, ProposalsAsset, ProposalId);
                }

                let MilestoneId = await MilestonesAsset.currentRecord.call();
                let MilestoneRecord = await MilestonesAsset.Collection.call( MilestoneId );
                assert.equal(MilestoneId.toString(), 3, "MilestoneId should be 3");

                await TestBuildHelper.timeTravelTo( MilestoneRecord[6] );
                await TestBuildHelper.doApplicationStateChanges("Owner MIA", false);


                let platformTokenBalanceInitial = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let FMLockedTokensInitial = await FundingManagerAsset.LockedVotingTokens.call();

                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let EtherBalanceInitial = await helpers.utils.getBalance(helpers.artifacts, investor1wallet);
                let EtherBalanceLeft = await helpers.utils.getBalance(helpers.artifacts, vault.address);
                let vaultTokenBalanceInitial = await TestBuildHelper.getTokenBalance(vault.address);

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
                let platformTokenBalanceAfter = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let platformTokenBalanceValidate = await platformTokenBalanceInitial.add( vaultTokenBalanceInitial );
                assert.equal(platformTokenBalanceAfter.toString(), platformTokenBalanceValidate.toString(), "Platform Owner wallet token balance does not match");

                // validate vault balances, all should be 0
                let VaultEtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, vault.address);
                assert.equal(VaultEtherBalanceAfter.toString(), 0, "VaultEtherBalanceAfter should be 0");
                let vaultTokenBalanceAfter = await TestBuildHelper.getTokenBalance(vault.address);
                assert.equal(vaultTokenBalanceAfter.toString(), 0, "vaultTokenBalanceAfter should be 0");
            });

            it("MIA @ Milestone LAST - CashBack transfers all locked ether back to the investor, and locked tokens to platform owner, validates balances and gas usage", async () => {

                let ProposalId = 0;
                let MilestoneNum = await MilestonesAsset.RecordNum.call();
                let tx;

                for(let i = 1; i < MilestoneNum.toNumber(); i++ ) {

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

                    let currentTime = await MilestonesAsset.getTimestamp.call();
                    // set meeting time 10 days from now.
                    let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600 );
                    await MilestonesAsset.setCurrentMilestoneMeetingTime(meetingTime);
                    await TestBuildHelper.doApplicationStateChanges("Set Meeting Time", false);

                    tx = await TestBuildHelper.timeTravelTo(meetingTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("At Meeting Time", false);

                    await TestBuildHelper.doApplicationStateChanges("timeTravelTo", false);
                    ProposalId++;

                    // vote yes
                    tx = await ProposalsAsset.RegisterVote(ProposalId, true, {from: investor1wallet});

                    // time travel to end of proposal
                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(ProposalId);
                    let proposalEndTime = ProposalRecord[9].toNumber();
                    tx = await TestBuildHelper.timeTravelTo(proposalEndTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("Voting ended", false);

                    // await helpers.utils.displayProposal(helpers, ProposalsAsset, ProposalId);
                }

                let MilestoneId = await MilestonesAsset.currentRecord.call();
                assert.equal(MilestoneId.toString(), 7, "MilestoneId should be last");

                let MilestoneRecord = await MilestonesAsset.Collection.call( MilestoneId );

                await TestBuildHelper.timeTravelTo( MilestoneRecord[6] );
                await TestBuildHelper.doApplicationStateChanges("Owner MIA", false);


                let platformTokenBalanceInitial = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let FMLockedTokensInitial = await FundingManagerAsset.LockedVotingTokens.call();

                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let EtherBalanceInitial = await helpers.utils.getBalance(helpers.artifacts, investor1wallet);
                let EtherBalanceLeft = await helpers.utils.getBalance(helpers.artifacts, vault.address);
                let vaultTokenBalanceInitial = await TestBuildHelper.getTokenBalance(vault.address);

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
                let platformTokenBalanceAfter = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let platformTokenBalanceValidate = await platformTokenBalanceInitial.add( vaultTokenBalanceInitial );
                assert.equal(platformTokenBalanceAfter.toString(), platformTokenBalanceValidate.toString(), "Platform Owner wallet token balance does not match");

                // validate vault balances, all should be 0
                let VaultEtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, vault.address);
                assert.equal(VaultEtherBalanceAfter.toString(), 0, "VaultEtherBalanceAfter should be 0");
                let vaultTokenBalanceAfter = await TestBuildHelper.getTokenBalance(vault.address);
                assert.equal(vaultTokenBalanceAfter.toString(), 0, "vaultTokenBalanceAfter should be 0");
            });
        });



        // cashback at funding failed
        // cashback at mia milestone 1
        // cashback at mia milestone 3
        // cashback at mia milestone last

        // cashback at vote no milestone 1
        // cashback at vote no milestone 3
        // cashback at vote no milestone last
        // cashback at vote no milestone 3 investor 1 / cashback at vote no milestone 4 investor 4, no more locked, complete


        context("Platform Funding Successful - Cashback Type 3 - Milestone Release", async () => {

            let investor1wallet = wallet1;
            let investor1amount = 5000 * helpers.solidity.ether;
            let investor2wallet = wallet2;
            let investor2amount = 5000 * helpers.solidity.ether;
            let investor3wallet = wallet3;
            let investor3amount = 10000 * helpers.solidity.ether;
            let investor4wallet = wallet4;
            let investor4amount = 10000 * helpers.solidity.ether;

            let end_time, start_time;

            beforeEach(async () => {
                await FundingInputMilestone.sendTransaction({
                    value: investor1amount,
                    from: investor1wallet
                });

                await FundingInputDirect.sendTransaction({
                    value: investor2amount,
                    from: investor2wallet
                });

                // time travel to start of ICO, and change states
                await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                await TestBuildHelper.doApplicationStateChanges("After ICO START", false);

                await FundingInputDirect.sendTransaction({
                    value: investor3amount,
                    from: investor3wallet
                });

                await FundingInputMilestone.sendTransaction({
                    value: investor4amount,
                    from: investor4wallet
                });

                // time travel to end of ICO, and change states
                await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                await TestBuildHelper.doApplicationStateChanges("Funding End", false);

                // time travel to development start
                await TestBuildHelper.timeTravelTo(settings.bylaws["development_start"] + 1);
                await TestBuildHelper.doApplicationStateChanges("Development Started", false);

                let MilestoneId = await MilestonesAsset.currentRecord.call();
                let MilestoneRecord = await MilestonesAsset.Collection.call(MilestoneId);
                start_time = settings.bylaws["development_start"] + 1;
                // let start_time = MilestoneRecord[6];
                end_time = MilestoneRecord[6];

            });


            it("Proposal processed. Funding Vault allows the investor to CashBack if majority voted NO and investor also voted NO", async () => {

                let currentTime = await MilestonesAsset.getTimestamp.call();
                // set meeting time 10 days from now.
                let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600 );
                await MilestonesAsset.setCurrentMilestoneMeetingTime(meetingTime);
                tx = await TestBuildHelper.timeTravelTo(meetingTime + 1);
                await TestBuildHelper.doApplicationStateChanges("At Milestone Release Voting", false);

                let ProposalId = 1;
                tx = await ProposalsAsset.RegisterVote(ProposalId, false, {from: investor1wallet});

                // time travel to end of proposal
                let ProposalRecord = await ProposalsAsset.ProposalsById.call(ProposalId);
                let proposalEndTime = ProposalRecord[9].toNumber();
                tx = await TestBuildHelper.timeTravelTo(proposalEndTime + 1);
                await TestBuildHelper.doApplicationStateChanges("Voting ended", false);

                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let canCashBack = await vault.canCashBack.call();
                let checkMilestoneStateInvestorVotedNoVotingEndedNo = await vault.checkMilestoneStateInvestorVotedNoVotingEndedNo.call();
                assert.isTrue(canCashBack, "Should be able to CashBack");
                assert.isTrue(checkMilestoneStateInvestorVotedNoVotingEndedNo, "checkMilestoneStateInvestorVotedNoVotingEndedNo should be true");

                // vault 4 has locked tokens, but should not be allowed to cash back since they did not vote NO
                vault = await TestBuildHelper.getMyVaultAddress(investor4wallet);
                canCashBack = await vault.canCashBack.call();
                checkMilestoneStateInvestorVotedNoVotingEndedNo = await vault.checkMilestoneStateInvestorVotedNoVotingEndedNo.call();
                assert.isFalse(canCashBack, "Should not be able to CashBack");
                assert.isFalse(checkMilestoneStateInvestorVotedNoVotingEndedNo, "checkMilestoneStateInvestorVotedNoVotingEndedNo should be false");

                // continue
                currentTime = await MilestonesAsset.getTimestamp.call();
                let cashback_duration = await MilestonesAsset.getBylawsCashBackVoteRejectedDuration.call( );
                let after_cashback = currentTime.add(cashback_duration);
                tx = await TestBuildHelper.timeTravelTo(after_cashback + 1);
                await TestBuildHelper.doApplicationStateChanges("after cashback", false);

                let MilestoneId = await MilestonesAsset.currentRecord.call();
                assert.equal(MilestoneId.toString(), 2, "Milestone Id should be 2");

            });



            it("VOTE NO @ Milestone 1 - Proposal processed. Investor uses CashBack, validate balances", async () => {

                let ProposalId = 0;
                let MilestoneNum = await MilestonesAsset.RecordNum.call();
                let tx;

                let MilestoneId = await MilestonesAsset.currentRecord.call();
                assert.equal(MilestoneId.toString(), 1, "MilestoneId should be 1");

                let MilestoneRecord = await MilestonesAsset.Collection.call( MilestoneId );

                await TestBuildHelper.timeTravelTo( MilestoneRecord[6] );
                await TestBuildHelper.doApplicationStateChanges("Owner MIA", false);


                let platformTokenBalanceInitial = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let FMLockedTokensInitial = await FundingManagerAsset.LockedVotingTokens.call();

                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let EtherBalanceInitial = await helpers.utils.getBalance(helpers.artifacts, investor1wallet);
                let EtherBalanceLeft = await helpers.utils.getBalance(helpers.artifacts, vault.address);
                let vaultTokenBalanceInitial = await TestBuildHelper.getTokenBalance(vault.address);

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
                let platformTokenBalanceAfter = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let platformTokenBalanceValidate = await platformTokenBalanceInitial.add( vaultTokenBalanceInitial );
                assert.equal(platformTokenBalanceAfter.toString(), platformTokenBalanceValidate.toString(), "Platform Owner wallet token balance does not match");

                // validate vault balances, all should be 0
                let VaultEtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, vault.address);
                assert.equal(VaultEtherBalanceAfter.toString(), 0, "VaultEtherBalanceAfter should be 0");
                let vaultTokenBalanceAfter = await TestBuildHelper.getTokenBalance(vault.address);
                assert.equal(vaultTokenBalanceAfter.toString(), 0, "vaultTokenBalanceAfter should be 0");

            });


            it("VOTE NO @ Milestone 1 - Proposal processed. Investor uses CashBack, validate balances, can continue with next milestones", async () => {

                let ProposalId = 0;
                let MilestoneNum = await MilestonesAsset.RecordNum.call();
                let tx;

                let i = 1;

                let MilestoneId = await MilestonesAsset.currentRecord.call();
                let MilestoneRecord = await MilestonesAsset.Collection.call( MilestoneId );


                // time travel to start of milestone

                let start_time = settings.bylaws["development_start"] + 1;
                await TestBuildHelper.timeTravelTo(start_time);
                await TestBuildHelper.doApplicationStateChanges("at dev start time", false);

                ProposalId++;

                MilestoneId = await MilestonesAsset.currentRecord.call();
                assert.equal(MilestoneId.toString(), 1, "MilestoneId should be 1");

                let currentTime = await MilestonesAsset.getTimestamp.call();
                // set meeting time 10 days from now.
                let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600 );
                await MilestonesAsset.setCurrentMilestoneMeetingTime(meetingTime);
                tx = await TestBuildHelper.timeTravelTo(meetingTime + 1);
                await TestBuildHelper.doApplicationStateChanges("At Milestone Release Voting", false);

                tx = await ProposalsAsset.RegisterVote(ProposalId, false, {from: investor1wallet});

                // time travel to end of proposal
                let ProposalRecord = await ProposalsAsset.ProposalsById.call(ProposalId);
                let proposalEndTime = ProposalRecord[9].toNumber();
                tx = await TestBuildHelper.timeTravelTo(proposalEndTime + 1);
                await TestBuildHelper.doApplicationStateChanges("Voting ended", false);

                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let canCashBack = await vault.canCashBack.call();
                let checkMilestoneStateInvestorVotedNoVotingEndedNo = await vault.checkMilestoneStateInvestorVotedNoVotingEndedNo.call();
                assert.isTrue(canCashBack, "Should be able to CashBack");
                assert.isTrue(checkMilestoneStateInvestorVotedNoVotingEndedNo, "checkMilestoneStateInvestorVotedNoVotingEndedNo should be true");

                // vault 4 has locked tokens, but should not be allowed to cash back since they did not vote NO
                vault = await TestBuildHelper.getMyVaultAddress(investor4wallet);
                canCashBack = await vault.canCashBack.call();
                checkMilestoneStateInvestorVotedNoVotingEndedNo = await vault.checkMilestoneStateInvestorVotedNoVotingEndedNo.call();
                assert.isFalse(canCashBack, "Should not be able to CashBack");
                assert.isFalse(checkMilestoneStateInvestorVotedNoVotingEndedNo, "checkMilestoneStateInvestorVotedNoVotingEndedNo should be false");

                // cashback validated
                // now do it

                let platformTokenBalanceInitial = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let FMLockedTokensInitial = await FundingManagerAsset.LockedVotingTokens.call();
                vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let EtherBalanceInitial = await helpers.utils.getBalance(helpers.artifacts, investor1wallet);
                let EtherBalanceLeft = await helpers.utils.getBalance(helpers.artifacts, vault.address);
                let vaultTokenBalanceInitial = await TestBuildHelper.getTokenBalance(vault.address);

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
                let platformTokenBalanceAfter = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let platformTokenBalanceValidate = await platformTokenBalanceInitial.add( vaultTokenBalanceInitial );
                assert.equal(platformTokenBalanceAfter.toString(), platformTokenBalanceValidate.toString(), "Platform Owner wallet token balance does not match");

                // validate vault balances, all should be 0
                let VaultEtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, vault.address);
                assert.equal(VaultEtherBalanceAfter.toString(), 0, "VaultEtherBalanceAfter should be 0");
                let vaultTokenBalanceAfter = await TestBuildHelper.getTokenBalance(vault.address);
                assert.equal(vaultTokenBalanceAfter.toString(), 0, "vaultTokenBalanceAfter should be 0");


                // continue
                currentTime = await MilestonesAsset.getTimestamp.call();
                let cashback_duration = await MilestonesAsset.getBylawsCashBackVoteRejectedDuration.call();
                let after_cashback = currentTime.add(cashback_duration);
                tx = await TestBuildHelper.timeTravelTo(after_cashback.add(1));
                await TestBuildHelper.doApplicationStateChanges("after cashback", false);

                for(let i = MilestoneId; i < MilestoneNum; i++ ) {


                    let MilestoneId = await MilestonesAsset.currentRecord.call();
                    let MilestoneRecord = await MilestonesAsset.Collection.call( MilestoneId );

                    // time travel to start of milestone
                    let start_time = MilestoneRecord[4].add(1);

                    await TestBuildHelper.timeTravelTo(start_time);
                    let currentTime = await MilestonesAsset.getTimestamp.call();
                    // set meeting time 10 days from now.
                    let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600 );

                    await MilestonesAsset.setCurrentMilestoneMeetingTime(meetingTime);
                    await TestBuildHelper.doApplicationStateChanges("Set Meeting Time", false);

                    tx = await TestBuildHelper.timeTravelTo(meetingTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("At Meeting Time", false);

                    ProposalId++;
                    tx = await ProposalsAsset.RegisterVote(ProposalId, true, {from: investor4wallet});

                    // time travel to end of proposal
                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(ProposalId);
                    let proposalEndTime = ProposalRecord[9].toNumber();
                    tx = await TestBuildHelper.timeTravelTo(proposalEndTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("Voting ended", false);

                    if(MilestoneId === 5) {
                        break;
                    }
                }

                let appState = await ApplicationEntity.CurrentEntityState.call();
                let appStateCode = helpers.utils.getEntityStateIdByName("ApplicationEntity", "DEVELOPMENT_COMPLETE");
                assert.equal(appState.toString(), appStateCode, "ApplicationEntity state should be DEVELOPMENT_COMPLETE");
            });



            it("VOTE NO @ Milestone 3 - Proposal processed. Investor uses CashBack, validate balances, can continue with next milestones", async () => {

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

                    let currentTime = await MilestonesAsset.getTimestamp.call();
                    // set meeting time 10 days from now.
                    let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600 );
                    await MilestonesAsset.setCurrentMilestoneMeetingTime(meetingTime);
                    await TestBuildHelper.doApplicationStateChanges("Set Meeting Time", false);

                    tx = await TestBuildHelper.timeTravelTo(meetingTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("At Meeting Time", false);

                    await TestBuildHelper.doApplicationStateChanges("timeTravelTo", false);
                    ProposalId++;

                    // vote yes
                    tx = await ProposalsAsset.RegisterVote(ProposalId, true, {from: investor1wallet});

                    // time travel to end of proposal
                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(ProposalId);
                    let proposalEndTime = ProposalRecord[9].toNumber();
                    tx = await TestBuildHelper.timeTravelTo(proposalEndTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("Voting ended", false);
                }

                ProposalId++;

                let MilestoneId = await MilestonesAsset.currentRecord.call();
                assert.equal(MilestoneId.toString(), 3, "MilestoneId should be 3");

                let MilestoneRecord = await MilestonesAsset.Collection.call( MilestoneId );

                let currentTime = await MilestonesAsset.getTimestamp.call();
                // set meeting time 10 days from now.
                let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600 );
                await MilestonesAsset.setCurrentMilestoneMeetingTime(meetingTime);
                tx = await TestBuildHelper.timeTravelTo(meetingTime + 1);
                await TestBuildHelper.doApplicationStateChanges("At Milestone Release Voting", false);

                tx = await ProposalsAsset.RegisterVote(ProposalId, false, {from: investor1wallet});

                // time travel to end of proposal
                let ProposalRecord = await ProposalsAsset.ProposalsById.call(ProposalId);
                let proposalEndTime = ProposalRecord[9].toNumber();
                tx = await TestBuildHelper.timeTravelTo(proposalEndTime + 1);
                await TestBuildHelper.doApplicationStateChanges("Voting ended", false);

                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let canCashBack = await vault.canCashBack.call();
                let checkMilestoneStateInvestorVotedNoVotingEndedNo = await vault.checkMilestoneStateInvestorVotedNoVotingEndedNo.call();
                assert.isTrue(canCashBack, "Should be able to CashBack");
                assert.isTrue(checkMilestoneStateInvestorVotedNoVotingEndedNo, "checkMilestoneStateInvestorVotedNoVotingEndedNo should be true");

                // vault 4 has locked tokens, but should not be allowed to cash back since they did not vote NO
                vault = await TestBuildHelper.getMyVaultAddress(investor4wallet);
                canCashBack = await vault.canCashBack.call();
                checkMilestoneStateInvestorVotedNoVotingEndedNo = await vault.checkMilestoneStateInvestorVotedNoVotingEndedNo.call();
                assert.isFalse(canCashBack, "Should not be able to CashBack");
                assert.isFalse(checkMilestoneStateInvestorVotedNoVotingEndedNo, "checkMilestoneStateInvestorVotedNoVotingEndedNo should be false");

                // cashback validated
                // now do it

                let platformTokenBalanceInitial = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let FMLockedTokensInitial = await FundingManagerAsset.LockedVotingTokens.call();
                vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let EtherBalanceInitial = await helpers.utils.getBalance(helpers.artifacts, investor1wallet);
                let EtherBalanceLeft = await helpers.utils.getBalance(helpers.artifacts, vault.address);
                let vaultTokenBalanceInitial = await TestBuildHelper.getTokenBalance(vault.address);

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
                let platformTokenBalanceAfter = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let platformTokenBalanceValidate = await platformTokenBalanceInitial.add( vaultTokenBalanceInitial );
                assert.equal(platformTokenBalanceAfter.toString(), platformTokenBalanceValidate.toString(), "Platform Owner wallet token balance does not match");

                // validate vault balances, all should be 0
                let VaultEtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, vault.address);
                assert.equal(VaultEtherBalanceAfter.toString(), 0, "VaultEtherBalanceAfter should be 0");
                let vaultTokenBalanceAfter = await TestBuildHelper.getTokenBalance(vault.address);
                assert.equal(vaultTokenBalanceAfter.toString(), 0, "vaultTokenBalanceAfter should be 0");


                // continue
                currentTime = await MilestonesAsset.getTimestamp.call();
                let cashback_duration = await MilestonesAsset.getBylawsCashBackVoteRejectedDuration.call();
                let after_cashback = currentTime.add(cashback_duration);
                tx = await TestBuildHelper.timeTravelTo(after_cashback.add(1));
                await TestBuildHelper.doApplicationStateChanges("after cashback", false);

                for(let i = MilestoneId; i < MilestoneNum; i++ ) {


                    let MilestoneId = await MilestonesAsset.currentRecord.call();
                    let MilestoneRecord = await MilestonesAsset.Collection.call( MilestoneId );

                    // time travel to start of milestone
                    let start_time = MilestoneRecord[4].add(1);

                    await TestBuildHelper.timeTravelTo(start_time);
                    let currentTime = await MilestonesAsset.getTimestamp.call();
                    // set meeting time 10 days from now.
                    let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600 );

                    await MilestonesAsset.setCurrentMilestoneMeetingTime(meetingTime);
                    await TestBuildHelper.doApplicationStateChanges("Set Meeting Time", false);

                    tx = await TestBuildHelper.timeTravelTo(meetingTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("At Meeting Time", false);

                    ProposalId++;
                    tx = await ProposalsAsset.RegisterVote(ProposalId, true, {from: investor4wallet});

                    // time travel to end of proposal
                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(ProposalId);
                    let proposalEndTime = ProposalRecord[9].toNumber();
                    tx = await TestBuildHelper.timeTravelTo(proposalEndTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("Voting ended", false);

                    if(MilestoneId === 5) {
                        break;
                    }
                }

                let appState = await ApplicationEntity.CurrentEntityState.call();
                let appStateCode = helpers.utils.getEntityStateIdByName("ApplicationEntity", "DEVELOPMENT_COMPLETE");
                assert.equal(appState.toString(), appStateCode, "ApplicationEntity state should be DEVELOPMENT_COMPLETE");
            });

            it("VOTE NO @ Milestone 3 - Proposal processed. Investor does not use CashBack, validate balances, can continue with next milestones", async () => {

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

                    let currentTime = await MilestonesAsset.getTimestamp.call();
                    // set meeting time 10 days from now.
                    let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600 );
                    await MilestonesAsset.setCurrentMilestoneMeetingTime(meetingTime);
                    await TestBuildHelper.doApplicationStateChanges("Set Meeting Time", false);

                    tx = await TestBuildHelper.timeTravelTo(meetingTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("At Meeting Time", false);

                    await TestBuildHelper.doApplicationStateChanges("timeTravelTo", false);
                    ProposalId++;

                    // vote yes
                    tx = await ProposalsAsset.RegisterVote(ProposalId, true, {from: investor1wallet});

                    // time travel to end of proposal
                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(ProposalId);
                    let proposalEndTime = ProposalRecord[9].toNumber();
                    tx = await TestBuildHelper.timeTravelTo(proposalEndTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("Voting ended", false);
                }

                ProposalId++;

                let MilestoneId = await MilestonesAsset.currentRecord.call();
                assert.equal(MilestoneId.toString(), 3, "MilestoneId should be 3");

                let MilestoneRecord = await MilestonesAsset.Collection.call( MilestoneId );

                let currentTime = await MilestonesAsset.getTimestamp.call();
                // set meeting time 10 days from now.
                let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600 );
                await MilestonesAsset.setCurrentMilestoneMeetingTime(meetingTime);
                tx = await TestBuildHelper.timeTravelTo(meetingTime + 1);
                await TestBuildHelper.doApplicationStateChanges("At Milestone Release Voting", false);

                tx = await ProposalsAsset.RegisterVote(ProposalId, false, {from: investor1wallet});

                // time travel to end of proposal
                let ProposalRecord = await ProposalsAsset.ProposalsById.call(ProposalId);
                let proposalEndTime = ProposalRecord[9].toNumber();
                tx = await TestBuildHelper.timeTravelTo(proposalEndTime + 1);
                await TestBuildHelper.doApplicationStateChanges("Voting ended", false);

                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let canCashBack = await vault.canCashBack.call();
                let checkMilestoneStateInvestorVotedNoVotingEndedNo = await vault.checkMilestoneStateInvestorVotedNoVotingEndedNo.call();
                assert.isTrue(canCashBack, "Should be able to CashBack");
                assert.isTrue(checkMilestoneStateInvestorVotedNoVotingEndedNo, "checkMilestoneStateInvestorVotedNoVotingEndedNo should be true");

                // vault 4 has locked tokens, but should not be allowed to cash back since they did not vote NO
                vault = await TestBuildHelper.getMyVaultAddress(investor4wallet);
                canCashBack = await vault.canCashBack.call();
                checkMilestoneStateInvestorVotedNoVotingEndedNo = await vault.checkMilestoneStateInvestorVotedNoVotingEndedNo.call();
                assert.isFalse(canCashBack, "Should not be able to CashBack");
                assert.isFalse(checkMilestoneStateInvestorVotedNoVotingEndedNo, "checkMilestoneStateInvestorVotedNoVotingEndedNo should be false");

                // continue
                currentTime = await MilestonesAsset.getTimestamp.call();
                let cashback_duration = await MilestonesAsset.getBylawsCashBackVoteRejectedDuration.call();
                let after_cashback = currentTime.add(cashback_duration);
                tx = await TestBuildHelper.timeTravelTo(after_cashback.add(1));
                await TestBuildHelper.doApplicationStateChanges("after cashback", false);

                for(let i = MilestoneId; i < MilestoneNum; i++ ) {


                    let MilestoneId = await MilestonesAsset.currentRecord.call();
                    let MilestoneRecord = await MilestonesAsset.Collection.call( MilestoneId );

                    // time travel to start of milestone
                    let start_time = MilestoneRecord[4].add(1);

                    await TestBuildHelper.timeTravelTo(start_time);
                    let currentTime = await MilestonesAsset.getTimestamp.call();
                    // set meeting time 10 days from now.
                    let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600 );

                    await MilestonesAsset.setCurrentMilestoneMeetingTime(meetingTime);
                    await TestBuildHelper.doApplicationStateChanges("Set Meeting Time", false);

                    tx = await TestBuildHelper.timeTravelTo(meetingTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("At Meeting Time", false);

                    ProposalId++;
                    // tx = await ProposalsAsset.RegisterVote(ProposalId, true, {from: investor4wallet});

                    // time travel to end of proposal
                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(ProposalId);
                    let proposalEndTime = ProposalRecord[9].toNumber();
                    tx = await TestBuildHelper.timeTravelTo(proposalEndTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("Voting ended", false);

                    if(MilestoneId === 5) {
                        break;
                    }
                }

                let appState = await ApplicationEntity.CurrentEntityState.call();
                let appStateCode = helpers.utils.getEntityStateIdByName("ApplicationEntity", "DEVELOPMENT_COMPLETE");
                assert.equal(appState.toString(), appStateCode, "ApplicationEntity state should be DEVELOPMENT_COMPLETE");
            });

            it("VOTE NO @ Milestone LAST - Proposal processed. Investor uses CashBack, validate balances", async () => {

                let ProposalId = 0;
                let MilestoneNum = await MilestonesAsset.RecordNum.call();
                let tx;

                for(let i = 1; i < MilestoneNum.toNumber(); i++ ) {

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

                    let currentTime = await MilestonesAsset.getTimestamp.call();
                    // set meeting time 10 days from now.
                    let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600 );
                    await MilestonesAsset.setCurrentMilestoneMeetingTime(meetingTime);
                    await TestBuildHelper.doApplicationStateChanges("Set Meeting Time", false);

                    tx = await TestBuildHelper.timeTravelTo(meetingTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("At Meeting Time", false);

                    await TestBuildHelper.doApplicationStateChanges("timeTravelTo", false);
                    ProposalId++;

                    // vote yes
                    tx = await ProposalsAsset.RegisterVote(ProposalId, true, {from: investor1wallet});

                    // time travel to end of proposal
                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(ProposalId);
                    let proposalEndTime = ProposalRecord[9].toNumber();
                    tx = await TestBuildHelper.timeTravelTo(proposalEndTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("Voting ended", false);
                }



                let MilestoneId = await MilestonesAsset.currentRecord.call();
                assert.equal(MilestoneId.toString(), MilestoneNum.toString(), "MilestoneId should be 5");

                let MilestoneRecord = await MilestonesAsset.Collection.call( MilestoneId );

                await TestBuildHelper.timeTravelTo( MilestoneRecord[6] );
                await TestBuildHelper.doApplicationStateChanges("Owner MIA", false);


                let platformTokenBalanceInitial = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let FMLockedTokensInitial = await FundingManagerAsset.LockedVotingTokens.call();

                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let EtherBalanceInitial = await helpers.utils.getBalance(helpers.artifacts, investor1wallet);
                let EtherBalanceLeft = await helpers.utils.getBalance(helpers.artifacts, vault.address);
                let vaultTokenBalanceInitial = await TestBuildHelper.getTokenBalance(vault.address);

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
                let platformTokenBalanceAfter = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let platformTokenBalanceValidate = await platformTokenBalanceInitial.add( vaultTokenBalanceInitial );
                assert.equal(platformTokenBalanceAfter.toString(), platformTokenBalanceValidate.toString(), "Platform Owner wallet token balance does not match");

                // validate vault balances, all should be 0
                let VaultEtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, vault.address);
                assert.equal(VaultEtherBalanceAfter.toString(), 0, "VaultEtherBalanceAfter should be 0");
                let vaultTokenBalanceAfter = await TestBuildHelper.getTokenBalance(vault.address);
                assert.equal(vaultTokenBalanceAfter.toString(), 0, "vaultTokenBalanceAfter should be 0");

            });

            // cashback at vote no milestone 3 investor 1 / cashback at vote no milestone 4 investor 4, no more locked, complete

            it("All investors VOTE NO and cashback at @ Milestone 3, Milestone releases now require 0 votes, automatically finalise as successful", async () => {

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

                    let currentTime = await MilestonesAsset.getTimestamp.call();
                    // set meeting time 10 days from now.
                    let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600 );
                    await MilestonesAsset.setCurrentMilestoneMeetingTime(meetingTime);
                    await TestBuildHelper.doApplicationStateChanges("Set Meeting Time", false);

                    tx = await TestBuildHelper.timeTravelTo(meetingTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("At Meeting Time", false);
                    ProposalId++;

                    // vote yes
                    tx = await ProposalsAsset.RegisterVote(ProposalId, true, {from: investor1wallet});

                    // time travel to end of proposal
                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(ProposalId);
                    let proposalEndTime = ProposalRecord[9].toNumber();
                    tx = await TestBuildHelper.timeTravelTo(proposalEndTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("Voting ended", false);
                }

                ProposalId++;

                let MilestoneId = await MilestonesAsset.currentRecord.call();
                assert.equal(MilestoneId.toString(), 3, "MilestoneId should be 3");

                let MilestoneRecord = await MilestonesAsset.Collection.call( MilestoneId );

                let currentTime = await MilestonesAsset.getTimestamp.call();
                // set meeting time 10 days from now.
                let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600 );
                await MilestonesAsset.setCurrentMilestoneMeetingTime(meetingTime);
                tx = await TestBuildHelper.timeTravelTo(meetingTime + 1);
                await TestBuildHelper.doApplicationStateChanges("At Milestone Release Voting", false);

                tx = await ProposalsAsset.RegisterVote(ProposalId, false, {from: investor1wallet});
                tx = await ProposalsAsset.RegisterVote(ProposalId, false, {from: investor4wallet});

                // time travel to end of proposal
                let ProposalRecord = await ProposalsAsset.ProposalsById.call(ProposalId);
                let proposalEndTime = ProposalRecord[9].toNumber();
                tx = await TestBuildHelper.timeTravelTo(proposalEndTime + 1);
                await TestBuildHelper.doApplicationStateChanges("Voting ended", false);

                let vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let canCashBack = await vault.canCashBack.call();
                let checkMilestoneStateInvestorVotedNoVotingEndedNo = await vault.checkMilestoneStateInvestorVotedNoVotingEndedNo.call();
                assert.isTrue(canCashBack, "Should be able to CashBack");
                assert.isTrue(checkMilestoneStateInvestorVotedNoVotingEndedNo, "checkMilestoneStateInvestorVotedNoVotingEndedNo should be true");


                // cashback validated
                // now do it

                let platformTokenBalanceInitial = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let FMLockedTokensInitial = await FundingManagerAsset.LockedVotingTokens.call();
                vault = await TestBuildHelper.getMyVaultAddress(investor1wallet);
                let EtherBalanceInitial = await helpers.utils.getBalance(helpers.artifacts, investor1wallet);
                let EtherBalanceLeft = await helpers.utils.getBalance(helpers.artifacts, vault.address);
                let vaultTokenBalanceInitial = await TestBuildHelper.getTokenBalance(vault.address);

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
                let platformTokenBalanceAfter = await TestBuildHelper.getTokenBalance(platformWalletAddress);
                let platformTokenBalanceValidate = await platformTokenBalanceInitial.add( vaultTokenBalanceInitial );
                assert.equal(platformTokenBalanceAfter.toString(), platformTokenBalanceValidate.toString(), "Platform Owner wallet token balance does not match");

                // validate vault balances, all should be 0
                let VaultEtherBalanceAfter = await helpers.utils.getBalance(helpers.artifacts, vault.address);
                assert.equal(VaultEtherBalanceAfter.toString(), 0, "VaultEtherBalanceAfter should be 0");
                let vaultTokenBalanceAfter = await TestBuildHelper.getTokenBalance(vault.address);
                assert.equal(vaultTokenBalanceAfter.toString(), 0, "vaultTokenBalanceAfter should be 0");


                // await TestBuildHelper.showApplicationStates();
                // await helpers.utils.displayCashBackStatus(helpers, TestBuildHelper, investor4wallet);

                // TEST: also release funds for the other investors
                vault = await TestBuildHelper.getMyVaultAddress(investor4wallet);
                tx = await vault.ReleaseFundsToInvestor({from: investor4wallet});
                // await TestBuildHelper.doApplicationStateChanges("after cashback", false);

                // continue
                currentTime = await MilestonesAsset.getTimestamp.call();
                let cashback_duration = await MilestonesAsset.getBylawsCashBackVoteRejectedDuration.call();
                let after_cashback = currentTime.add(cashback_duration);
                tx = await TestBuildHelper.timeTravelTo(after_cashback.add(1));
                await TestBuildHelper.doApplicationStateChanges("after cashback", false);

                for(let i = MilestoneId; i < MilestoneNum; i++ ) {


                    let MilestoneId = await MilestonesAsset.currentRecord.call();
                    let MilestoneRecord = await MilestonesAsset.Collection.call( MilestoneId );

                    // time travel to start of milestone
                    let start_time = MilestoneRecord[4].add(1);

                    await TestBuildHelper.timeTravelTo(start_time);
                    let currentTime = await MilestonesAsset.getTimestamp.call();
                    // set meeting time 10 days from now.
                    let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600 );

                    await MilestonesAsset.setCurrentMilestoneMeetingTime(meetingTime);
                    await TestBuildHelper.doApplicationStateChanges("Set Meeting Time", false);

                    tx = await TestBuildHelper.timeTravelTo(meetingTime + 1);
                    await TestBuildHelper.doApplicationStateChanges("At Meeting Time", false);

                    ProposalId++;

                    // not voting anymore.. because we don't have any voters left.
                    // proposal should close automatically
                    // tx = await ProposalsAsset.RegisterVote(ProposalId, true, {from: investor4wallet});
                    // await TestBuildHelper.doApplicationStateChanges("RegisterVote", false);

                    // validate proposal closes
                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(ProposalId);
                    let ProposalState = helpers.utils.getRecordStateNameById("Proposals", ProposalRecord[3].toNumber() );
                    assert.equal(ProposalState, "VOTING_RESULT_YES", "Proposal state should be VOTING_RESULT_YES");

                    if(MilestoneId.toNumber() === MilestoneNum.toNumber()) {
                        break;
                    }
                }

                let appState = await ApplicationEntity.CurrentEntityState.call();
                let appStateCode = helpers.utils.getEntityStateIdByName("ApplicationEntity", "DEVELOPMENT_COMPLETE");
                assert.equal(appState.toString(), appStateCode, "ApplicationEntity state should be DEVELOPMENT_COMPLETE");
            });

        });

    });

};