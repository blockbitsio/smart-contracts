module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    contract('Milestones Asset - Settings NOT Locked', accounts => {
        let assetContract, tx, TestBuildHelper, MilestonesContract = {};
        let assetName = "Milestones";

        let platformWalletAddress = accounts[19];


        beforeEach(async () => {
            TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
            await TestBuildHelper.deployAndInitializeApplication();
            await TestBuildHelper.AddAllAssetSettingsAndLockExcept("Milestones");

            // let's not lock Milestones yet. need to do tests on this baby
            // await TestBuildHelper.AddAssetSettingsAndLock("Milestones");

            assetContract = await TestBuildHelper.getDeployedByName("Milestones");
            MilestonesContract = assetContract;

        });

        context("addRecord()", async () => {
            it('works if settings are not already locked', async () => {
                let rec = settings.milestones[0];
                await assetContract.addRecord(rec.name, rec.description, rec.duration, rec.funding_percentage);
                let recordNumAfter = await assetContract.RecordNum.call();
                assert.equal(1, recordNumAfter.toString(), "Record number does not match.");
            });

            it('throws if settings are locked', async () => {
                await TestBuildHelper.AddAssetSettingsAndLock("Milestones");
                let rec = settings.milestones[0];
                return helpers.assertInvalidOpcode(async () => {
                    await assetContract.addRecord(rec.name, rec.description, rec.duration, rec.funding_percentage);
                });
            });
        });

        it('starts with state as New and requires a change to WAITING if current time is before development start', async () => {
            let validation = await TestBuildHelper.ValidateEntityAndRecordState(
                assetName,
                helpers.utils.getEntityStateIdByName(assetName, "NEW").toString(),
                helpers.utils.getEntityStateIdByName(assetName, "WAITING").toString(),
                helpers.utils.getRecordStateIdByName(assetName, "NONE").toString(),
                helpers.utils.getRecordStateIdByName(assetName, "NONE").toString()
            );
            assert.isTrue(validation, 'State validation failed..');
        });

    });
};