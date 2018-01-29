module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];

    let snapshotsEnabled = true;
    let snapshots = [];

    contract('Milestones Asset - Settings Locked', accounts => {
        let assetContract, tx, TestBuildHelper, FundingInputDirect, FundingInputMilestone, MilestonesContract, validation = {};
        let assetName = "Milestones";
        let platformWalletAddress = accounts[19];

        beforeEach(async () => {

            let SnapShotKey = "ApplicationInit";
            if( typeof snapshots[SnapShotKey] !== "undefined" && snapshotsEnabled) {
                // restore snapshot
                await helpers.web3.evm.revert( snapshots[SnapShotKey] );
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
                    from: accounts[10]
                });

                await FundingInputDirect.sendTransaction({
                    value: 5000 * helpers.solidity.ether,
                    from: accounts[11]
                });

                // time travel to start of ICO, and change states
                await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                await TestBuildHelper.doApplicationStateChanges("After ICO START", false);

                await FundingInputDirect.sendTransaction({
                    value: 10000 * helpers.solidity.ether,
                    from: accounts[10]
                });

                await FundingInputMilestone.sendTransaction({
                    value: 10000 * helpers.solidity.ether,
                    from: accounts[11]
                });

                // time travel to end of ICO, and change states
                await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                await TestBuildHelper.doApplicationStateChanges("Funding End", false);

                // create snapshot
                if(snapshotsEnabled) {
                    snapshots[SnapShotKey] = await helpers.web3.evm.snapshot();
                }
            }

            assetContract = await TestBuildHelper.getDeployedByName("Milestones");
            MilestonesContract = assetContract

        });

        it('isRecordUpdateAllowed should return false', async () => {
            let isRecordUpdateAllowed = await MilestonesContract.isRecordUpdateAllowed.call(1);
            assert.isFalse(isRecordUpdateAllowed, 'isRecordUpdateAllowed should be false');
        });

        context("states", async () => {

            it('throws if trying to set Meeting time after it was already set.', async () => {

                await TestBuildHelper.timeTravelTo(settings.bylaws["development_start"] + 1);
                await TestBuildHelper.doApplicationStateChanges("Development Started", false);

                // time travel to end of milestone
                let duration = settings.milestones[0].duration;
                let time = settings.bylaws["development_start"] + duration +1;

                let currentTime = await MilestonesContract.getTimestamp.call();
                let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600);

                await MilestonesContract.setCurrentMilestoneMeetingTime(meetingTime);
                await TestBuildHelper.doApplicationStateChanges("Meeting time set", false);

                validation = await TestBuildHelper.ValidateEntityAndRecordState(
                    assetName,
                    helpers.utils.getEntityStateIdByName(assetName, "DEADLINE_MEETING_TIME_YES").toString(),
                    helpers.utils.getEntityStateIdByName(assetName, "NONE").toString(),
                    helpers.utils.getRecordStateIdByName(assetName, "IN_PROGRESS").toString(),
                    helpers.utils.getRecordStateIdByName(assetName, "NONE").toString()
                );
                assert.isTrue(validation, 'State validation failed..');

                return helpers.assertInvalidOpcode(async () => {
                    await MilestonesContract.setCurrentMilestoneMeetingTime(meetingTime + 10);
                });
            });

            it('throws if now is @ expiry time and trying to set Meeting time at expiry time.', async () => {


                await TestBuildHelper.timeTravelTo(settings.bylaws["development_start"] + 1);
                await TestBuildHelper.doApplicationStateChanges("Development Started", false);

                // time travel to end of milestone
                let duration = settings.milestones[0].duration;
                let time = settings.bylaws["development_start"] + duration +1;

                let currentTime = await MilestonesContract.getTimestamp.call();
                let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600);


                let meetingCreationMaxTime = time - 1;
                let getBylawsMinTimeInTheFutureForMeetingCreation = await MilestonesContract.getBylawsMinTimeInTheFutureForMeetingCreation.call();
                meetingCreationMaxTime = getBylawsMinTimeInTheFutureForMeetingCreation.sub(meetingCreationMaxTime);

                await TestBuildHelper.timeTravelTo(meetingCreationMaxTime);
                // await TestBuildHelper.doApplicationStateChanges("Meeting time set", false);

                return helpers.assertInvalidOpcode(async () => {
                    await MilestonesContract.setCurrentMilestoneMeetingTime(meetingCreationMaxTime);
                });

            });

            it('handles ENTITY state change from WAITING to WAITING_MEETING_TIME when current time is after development start', async () => {

                tx = await TestBuildHelper.timeTravelTo(settings.bylaws["development_start"] + 1);
                await TestBuildHelper.doApplicationStateChanges("Development Started", false);

                validation = await TestBuildHelper.ValidateEntityAndRecordState(
                    assetName,
                    helpers.utils.getEntityStateIdByName(assetName, "WAITING_MEETING_TIME").toString(),
                    helpers.utils.getEntityStateIdByName(assetName, "NONE").toString(),
                    helpers.utils.getRecordStateIdByName(assetName, "IN_PROGRESS").toString(),
                    helpers.utils.getRecordStateIdByName(assetName, "NONE").toString()
                );
                assert.isTrue(validation, 'State validation failed..');

            });

            it('handles ENTITY state change from WAITING_MEETING_TIME to DEADLINE_MEETING_TIME_FAILED when current time is after milestone end, and meeting time was not set', async () => {

                tx = await TestBuildHelper.timeTravelTo(settings.bylaws["development_start"] + 1);
                await TestBuildHelper.doApplicationStateChanges("Development Started", false);

                // time travel to end of milestone
                let duration = settings.milestones[0].duration;
                let time = settings.bylaws["development_start"] + 1 + duration;
                tx = await TestBuildHelper.timeTravelTo(time);

                await TestBuildHelper.doApplicationStateChanges("Milestone End", false);
                // await helpers.utils.showCurrentState(helpers, assetContract);


                validation = await TestBuildHelper.ValidateEntityAndRecordState(
                    assetName,
                    helpers.utils.getEntityStateIdByName(assetName, "DEADLINE_MEETING_TIME_FAILED").toString(),
                    helpers.utils.getEntityStateIdByName(assetName, "NONE").toString(),
                    helpers.utils.getRecordStateIdByName(assetName, "IN_PROGRESS").toString(),
                    helpers.utils.getRecordStateIdByName(assetName, "NONE").toString()
                );
                assert.isTrue(validation, 'State validation failed..');

            });

            it('handles ENTITY state change from WAITING_MEETING_TIME to DEADLINE_MEETING_TIME_YES when current time is after milestone end, and meeting time was set', async () => {

                await TestBuildHelper.timeTravelTo(settings.bylaws["development_start"] + 1);
                await TestBuildHelper.doApplicationStateChanges("Development Started", false);

                // time travel to end of milestone
                let duration = settings.milestones[0].duration;
                let time = settings.bylaws["development_start"] + duration +1;

                let currentTime = await MilestonesContract.getTimestamp.call();
                let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600);

                await MilestonesContract.setCurrentMilestoneMeetingTime(meetingTime);
                await TestBuildHelper.doApplicationStateChanges("Meeting time set", false);

                validation = await TestBuildHelper.ValidateEntityAndRecordState(
                    assetName,
                    helpers.utils.getEntityStateIdByName(assetName, "DEADLINE_MEETING_TIME_YES").toString(),
                    helpers.utils.getEntityStateIdByName(assetName, "NONE").toString(),
                    helpers.utils.getRecordStateIdByName(assetName, "IN_PROGRESS").toString(),
                    helpers.utils.getRecordStateIdByName(assetName, "NONE").toString()
                );
                assert.isTrue(validation, 'State validation failed..');

                // validate meeting created

            });

            it('handles ENTITY state change from DEADLINE_MEETING_TIME_YES to VOTING_IN_PROGRESS when current time is after meeting time', async () => {

                await TestBuildHelper.timeTravelTo(settings.bylaws["development_start"] + 1);
                await TestBuildHelper.doApplicationStateChanges("Development Started", false);

                // time travel to end of milestone
                let duration = settings.milestones[0].duration;
                let time = settings.bylaws["development_start"] + duration +1;

                let currentTime = await MilestonesContract.getTimestamp.call();
                let meetingTime = currentTime.toNumber() + ( 10 * 24 * 3600);

                await MilestonesContract.setCurrentMilestoneMeetingTime(meetingTime);
                await TestBuildHelper.doApplicationStateChanges("Meeting time set", false);

                tx = await TestBuildHelper.timeTravelTo(meetingTime + 1);

                await TestBuildHelper.doApplicationStateChanges("At Meeting time", false);

                validation = await TestBuildHelper.ValidateEntityAndRecordState(
                    assetName,
                    helpers.utils.getEntityStateIdByName(assetName, "VOTING_IN_PROGRESS").toString(),
                    helpers.utils.getEntityStateIdByName(assetName, "NONE").toString(),
                    helpers.utils.getRecordStateIdByName(assetName, "IN_PROGRESS").toString(),
                    helpers.utils.getRecordStateIdByName(assetName, "NONE").toString()
                );
                assert.isTrue(validation, 'State validation failed..');

            });



        });
    });
};