module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];

    let snapshotsEnabled = true;
    let snapshots = [];

    contract('Proposals Asset - Settings Locked', accounts => {
        let assetContract, tx, TestBuildHelper, FundingInputDirect, FundingInputMilestone, ProposalsAsset,
            MilestonesAsset, ApplicationEntity, ListingContractAsset, validation = {};

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

                // create snapshot
                if (snapshotsEnabled) {
                    snapshots[SnapShotKey] = await helpers.web3.evm.snapshot();
                }
            }

            assetContract = await TestBuildHelper.getDeployedByName("Proposals");
            ProposalsAsset = assetContract;
            MilestonesAsset = await TestBuildHelper.getDeployedByName("Milestones");
            ApplicationEntity = await TestBuildHelper.getDeployedByName("ApplicationEntity");
            ListingContractAsset = await TestBuildHelper.getDeployedByName("ListingContract");

        });


        it( "Asset deploys and initialises properly", async () => {
            let getActionType = await ProposalsAsset.getActionType.call("MILESTONE_DEADLINE");
            let actionType = helpers.utils.getActionIdByName("Proposals", "MILESTONE_DEADLINE");
            assert.equal(actionType.toString(), getActionType.toString(), 'ActionType does not match');
        });


        context("proposal creation", async () => {

            context("type 1 - IN_DEVELOPMENT_CODE_UPGRADE - Voting Type - Milestone", async () => {

                it( "throws if called by any address other than ApplicationEntity", async () => {
                    return helpers.assertInvalidOpcode(async () => {
                        await ProposalsAsset.addCodeUpgradeProposal(await ProposalsAsset.address, "testurl");
                    });
                });

                it( "creates the proposal if called by the current ApplicationEntity", async () => {
                    let app = await contracts.ApplicationEntity.new();

                    let eventFilter = helpers.utils.hasEvent(
                        await ApplicationEntity.callTestAddCodeUpgradeProposal(await app.address, "url"),
                        'EventNewProposalCreated(bytes32,uint256)'
                    );
                    assert.equal(eventFilter.length, 1, 'EventNewProposalCreated event not received.');

                    let RecordNum = await ProposalsAsset.RecordNum.call();
                    assert.equal(RecordNum, 1, 'RecordNum does not match');

                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(1);
                    assert.equal(
                        ProposalRecord[2].toString(),
                        helpers.utils.getActionIdByName("Proposals", "IN_DEVELOPMENT_CODE_UPGRADE").toString(),
                        'Proposal record type does not match'
                    );
                });

            });


            context("type 2 - EMERGENCY_FUND_RELEASE - Voting Type - Milestone", async () => {

                it( "throws if called by any address other than deployer", async () => {
                    return helpers.assertInvalidOpcode(async () => {
                        await ProposalsAsset.createEmergencyFundReleaseProposal( {from: accounts[2] } );
                    });
                });

                it( "creates the proposal if called by the current deployer", async () => {
                    let eventFilter = helpers.utils.hasEvent(
                        await ProposalsAsset.createEmergencyFundReleaseProposal(),
                        'EventNewProposalCreated(bytes32,uint256)'
                    );
                    assert.equal(eventFilter.length, 1, 'EventNewProposalCreated event not received.');

                    let RecordNum = await ProposalsAsset.RecordNum.call();
                    assert.equal(RecordNum, 1, 'RecordNum does not match');

                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(1);
                    assert.equal(
                        ProposalRecord[2].toString(),
                        helpers.utils.getActionIdByName("Proposals", "EMERGENCY_FUND_RELEASE").toString(),
                        'Proposal record type does not match'
                    );

                });

            });

            context("type 3 - MILESTONE_POSTPONING - Voting Type - Milestone", async () => {

                let duration = settings.bylaws.min_postponing + 1;

                it( "throws if called by any address other than deployer", async () => {
                    return helpers.assertInvalidOpcode(async () => {
                        await ProposalsAsset.createMilestonePostponingProposal( duration, {from: accounts[2] } );
                    });
                });

                it( "throws if duration is not higher than min postponing bylaw", async () => {
                    return helpers.assertInvalidOpcode(async () => {
                        await ProposalsAsset.createMilestonePostponingProposal( 1 );
                    });
                });

                it( "throws if duration is higher than max postponing bylaw", async () => {
                    return helpers.assertInvalidOpcode(async () => {
                        await ProposalsAsset.createMilestonePostponingProposal( settings.bylaws.max_postponing + 1 );
                    });
                });

                it( "creates the proposal if called by the current deployer with correct duration", async () => {
                    let eventFilter = helpers.utils.hasEvent(
                        await ProposalsAsset.createMilestonePostponingProposal( duration ),
                        'EventNewProposalCreated(bytes32,uint256)'
                    );
                    assert.equal(eventFilter.length, 1, 'EventNewProposalCreated event not received.');

                    let RecordNum = await ProposalsAsset.RecordNum.call();
                    assert.equal(RecordNum, 1, 'RecordNum does not match');

                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(1);
                    assert.equal(
                        ProposalRecord[2].toString(),
                        helpers.utils.getActionIdByName("Proposals", "MILESTONE_POSTPONING").toString(),
                        'Proposal record type does not match'
                    );

                });
            });

            context("type 4 - MILESTONE_DEADLINE - Voting Type - Milestone", async () => {

                it( "throws if called by any address other than MilestoneAsset", async () => {
                    return helpers.assertInvalidOpcode(async () => {
                        await ProposalsAsset.createMilestoneAcceptanceProposal();
                    });
                });

                it( "creates the proposal if called by the current MilestoneAsset", async () => {

                    let eventFilter = helpers.utils.hasEvent(
                        await MilestonesAsset.callTestCreateMilestoneAcceptanceProposal(),
                        'EventNewProposalCreated(bytes32,uint256)'
                    );
                    assert.equal(eventFilter.length, 1, 'EventNewProposalCreated event not received.');

                    let RecordNum = await ProposalsAsset.RecordNum.call();
                    assert.equal(RecordNum, 1, 'RecordNum does not match');

                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(1);
                    assert.equal(
                        ProposalRecord[2].toString(),
                        helpers.utils.getActionIdByName("Proposals", "MILESTONE_DEADLINE").toString(),
                        'Proposal record type does not match'
                    );

                });

            });

            context("type 5 - PROJECT_DELISTING - Voting Type - Tokens", async () => {

                let ChildItemId, TestBuildHelperSecond, childSettings;

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

                    childSettings = {
                        bylaws:          child_bylaws,
                        funding_periods: child_funding_periods,
                        milestones:      settings.milestones,
                        token:           settings.token,
                        tokenSCADA:      settings.tokenSCADA,
                        solidity:        settings.solidity,
                        doDeployments:   settings.doDeployments
                    };

                    let childSetup = helpers.utils.getSetupClone(setup, childSettings);

                    TestBuildHelperSecond = new helpers.TestBuildHelper(childSetup, assert, accounts, accounts[0]);
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
                });


                it( "throws if called by an address that does not hold any tokens. ( none in wallet / none in vault )", async () => {
                    return helpers.assertInvalidOpcode(async () => {
                        await ProposalsAsset.createDelistingProposal( ChildItemId )
                    });
                });

                it( "throws if child application is beyond FUNDING_STARTED state.", async () => {

                    // time travel to pre ico start time
                    await TestBuildHelperSecond.timeTravelTo( childSettings.funding_periods[0].start_time + 1 );
                    await TestBuildHelperSecond.doApplicationStateChanges("After PRE ICO START", false);

                    return helpers.assertInvalidOpcode(async () => {
                        await ProposalsAsset.createDelistingProposal( ChildItemId, {from: wallet1} )
                    });

                });

                it( "creates the proposal if called by a token holder, (tokens locked in vault)", async () => {

                    let eventFilter = helpers.utils.hasEvent(
                        await ProposalsAsset.createDelistingProposal( ChildItemId, {from: wallet1} ),
                        'EventNewProposalCreated(bytes32,uint256)'
                    );
                    assert.equal(eventFilter.length, 1, 'EventNewProposalCreated event not received.');

                    let RecordNum = await ProposalsAsset.RecordNum.call();
                    assert.equal(RecordNum, 1, 'RecordNum does not match');

                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(1);
                    assert.equal(
                        ProposalRecord[2].toString(),
                        helpers.utils.getActionIdByName("Proposals", "PROJECT_DELISTING").toString(),
                        'Proposal record type does not match'
                    );
                });

                it( "creates the proposal if called by a token holder, (tokens locked in vault)", async () => {

                    let eventFilter = helpers.utils.hasEvent(
                        await ProposalsAsset.createDelistingProposal( ChildItemId, {from: wallet1} ),
                        'EventNewProposalCreated(bytes32,uint256)'
                    );
                    assert.equal(eventFilter.length, 1, 'EventNewProposalCreated event not received.');

                    let RecordNum = await ProposalsAsset.RecordNum.call();
                    assert.equal(RecordNum, 1, 'RecordNum does not match');

                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(1);
                    assert.equal(
                        ProposalRecord[2].toString(),
                        helpers.utils.getActionIdByName("Proposals", "PROJECT_DELISTING").toString(),
                        'Proposal record type does not match'
                    );
                });

                it( "creates the proposal if called by a token holder, (tokens in wallet)", async () => {

                    let eventFilter = helpers.utils.hasEvent(
                        await ProposalsAsset.createDelistingProposal( ChildItemId, {from: wallet2} ),
                        'EventNewProposalCreated(bytes32,uint256)'
                    );
                    assert.equal(eventFilter.length, 1, 'EventNewProposalCreated event not received.');

                    let RecordNum = await ProposalsAsset.RecordNum.call();
                    assert.equal(RecordNum, 1, 'RecordNum does not match');

                    let ProposalRecord = await ProposalsAsset.ProposalsById.call(1);
                    assert.equal(
                        ProposalRecord[2].toString(),
                        helpers.utils.getActionIdByName("Proposals", "PROJECT_DELISTING").toString(),
                        'Proposal record type does not match'
                    );
                });

            });

            context("type 6 - AFTER_COMPLETE_CODE_UPGRADE - Voting Type - Tokens", async () => {

                // move application to complete, then release all tokens to all investors.
                // after that we can test this case

                // done in 4_Asset_Proposals_Type_6_Complete_CodeUpgrade

            });

            context('misc for extra coverage', async () => {

                it('getRequiredStateChanges()', async () => {
                    await ProposalsAsset.getRequiredStateChanges.call();
                });

                it('hasRequiredStateChanges()', async () => {
                    await ProposalsAsset.hasRequiredStateChanges.call();
                });

                it('process() throws if called by any other than ApplicationEntity', async () => {
                    return helpers.assertInvalidOpcode(async () => {
                        await ProposalsAsset.process();
                    });
                });

                it('getMyVote()', async () => {
                    await ProposalsAsset.getMyVote( 1, wallet1);
                });

                it('getProposalState()', async () => {
                    await ProposalsAsset.getProposalState.call(1);
                });

                it('getBylawsMilestoneMinPostponing()', async () => {
                    await ProposalsAsset.getBylawsMilestoneMinPostponing.call();
                });

                it('getBylawsMilestoneMaxPostponing()', async () => {
                    await ProposalsAsset.getBylawsMilestoneMaxPostponing.call();
                });

                it('getVotingPower() for non existent investor', async () => {
                    let Power = await ProposalsAsset.getVotingPower.call(1, accounts[0]);
                    assert.equal(Power.toNumber(), 0, "Power is not 0");
                });

            });

        });

    });
};