module.exports = function (setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;
    let token_settings = setup.settings.token;

    let pre_ico_settings = setup.settings.funding_periods[0];
    let ico_settings = setup.settings.funding_periods[1];


    contract('Funding Asset - States', accounts => {
        let app, assetContract, TestBuildHelper = {};
        let assetName = "Funding";

        // test wallets
        let investorWallet1 = accounts[3];
        let investorWallet2 = accounts[4];
        let investorWallet3 = accounts[5];
        let investorWallet4 = accounts[6];
        let investorWallet5 = accounts[7];
        let investorWallet6 = accounts[8];
        let investorWallet7 = accounts[9];

        // settings
        let platformWalletAddress = accounts[8];

        let FundingInputDirect, FundingInputMilestone, myFundingVault, tx, validation;

        beforeEach(async () => {

            TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
            await TestBuildHelper.deployAndInitializeApplication();
            await TestBuildHelper.AddAllAssetSettingsAndLockExcept();
            assetContract = await TestBuildHelper.getDeployedByName("Funding");

            // funding inputs
            let FundingInputDirectAddress = await assetContract.DirectInput.call();
            let FundingInputMilestoneAddress = await assetContract.MilestoneInput.call();

            let FundingInputDirectContract = await helpers.getContract('FundingInputDirect');
            let FundingInputMilestoneContract = await helpers.getContract('FundingInputMilestone');

            FundingInputDirect = await FundingInputDirectContract.at(FundingInputDirectAddress);
            FundingInputMilestone = await FundingInputMilestoneContract.at(FundingInputMilestoneAddress);
        });



        it('starts with state as New and requires a change to WAITING if current time is before any funding stage', async () => {
            validation = await TestBuildHelper.ValidateFundingState(
                helpers.utils.getFundingEntityStateIdByName("NEW").toString(),
                helpers.utils.getFundingEntityStateIdByName("WAITING").toString(),
                helpers.utils.getFundingStageStateIdByName("NEW").toString(),
                helpers.utils.getFundingStageStateIdByName("NONE").toString()
            );
            assert.isTrue(validation, 'State validation failed..');
        });

        it('handles ENTITY state change from NEW to WAITING when funding does not start yet', async () => {
            validation = await TestBuildHelper.ValidateFundingState(
                helpers.utils.getFundingEntityStateIdByName("NEW").toString(),
                helpers.utils.getFundingEntityStateIdByName("WAITING").toString(),
                helpers.utils.getFundingStageStateIdByName("NEW").toString(),
                helpers.utils.getFundingStageStateIdByName("NONE").toString()
            );
            assert.isTrue(validation, 'State validation failed..');
            tx = await assetContract.doStateChanges();

            validation = await TestBuildHelper.ValidateFundingState(
                helpers.utils.getFundingEntityStateIdByName("WAITING").toString(),
                helpers.utils.getFundingEntityStateIdByName("NONE").toString(),
                helpers.utils.getFundingStageStateIdByName("NEW").toString(),
                helpers.utils.getFundingStageStateIdByName("NONE").toString()
            );
            assert.isTrue(validation, 'State validation failed..');
        });



        //
        // no longer a requirement
        //
        // it('starts with state as New and has correct Token Balance once in WAITING state', async () => {
        //     tx = await assetContract.doStateChanges();
        //
        //     validation = await TestBuildHelper.ValidateFundingState(
        //         helpers.utils.getFundingEntityStateIdByName("WAITING").toString(),
        //         helpers.utils.getFundingEntityStateIdByName("NONE").toString(),
        //         helpers.utils.getFundingStageStateIdByName("NEW").toString(),
        //         helpers.utils.getFundingStageStateIdByName("NONE").toString()
        //     );
        //     assert.isTrue(validation, 'State validation failed..');
        //
        //     let TokenContract = await TestBuildHelper.getTokenContract();
        //     let FundingManagerAddress = await assetContract.getApplicationAssetAddressByName.call('FundingManager');
        //     let TokenSupply = await TokenContract.totalSupply.call();
        //     let FundingBountyTokenPercentage = settings.bylaws["token_bounty_percentage"];
        //     let BountySupply = TokenSupply / 100 * FundingBountyTokenPercentage;
        //     let FundingSellTokenPercentage = await assetContract.TokenSellPercentage.call();
        //     let FundingManagerBalance = await TokenContract.balanceOf.call( FundingManagerAddress );
        //     let SellValue = ( TokenSupply / 100 * FundingSellTokenPercentage ) - ( BountySupply / 2) + ( 1 * helpers.solidity.ether );
        //     assert.equal(FundingManagerBalance.toNumber(), SellValue, 'Balances do not match..');
        // });



        it('handles ENTITY state change from NEW or WAITING to IN_PROGRESS when funding time start has passed', async () => {
            tx = await TestBuildHelper.timeTravelTo( pre_ico_settings.start_time + 1 );
            tx = await assetContract.doStateChanges();
            validation = await TestBuildHelper.ValidateFundingState(
                helpers.utils.getFundingEntityStateIdByName("IN_PROGRESS").toString(),
                helpers.utils.getFundingEntityStateIdByName("NONE").toString(),
                helpers.utils.getFundingStageStateIdByName("IN_PROGRESS").toString(),
                helpers.utils.getFundingStageStateIdByName("NONE").toString()
            );
            assert.isTrue(validation, 'State validation failed..');
        });

        it('is in IN_PROGRESS, receives payments, pre_ico time passes, should Require change to COOLDOWN', async () => {

            tx = await TestBuildHelper.timeTravelTo( pre_ico_settings.start_time + 1 );
            tx = await assetContract.doStateChanges();

            let DirectPaymentValue = 1 * helpers.solidity.ether;
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet1});
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet2});

            tx = await TestBuildHelper.timeTravelTo( pre_ico_settings.end_time + 1 );

            validation = await TestBuildHelper.ValidateFundingState(
                helpers.utils.getFundingEntityStateIdByName("IN_PROGRESS").toString(),
                helpers.utils.getFundingEntityStateIdByName("COOLDOWN").toString(),
                helpers.utils.getFundingStageStateIdByName("IN_PROGRESS").toString(),
                helpers.utils.getFundingStageStateIdByName("FINAL").toString()
            );
            assert.isTrue(validation, 'State validation failed..');

        });

        it('handles ENTITY state change from IN_PROGRESS to COOLDOWN when funding period time start has passed', async () => {

            tx = await TestBuildHelper.timeTravelTo( pre_ico_settings.start_time + 1 );
            tx = await assetContract.doStateChanges();

            let DirectPaymentValue = 1 * helpers.solidity.ether;
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet1});
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet2});

            tx = await TestBuildHelper.timeTravelTo( pre_ico_settings.end_time + 1 );

            validation = await TestBuildHelper.ValidateFundingState(
                helpers.utils.getFundingEntityStateIdByName("IN_PROGRESS").toString(),
                helpers.utils.getFundingEntityStateIdByName("COOLDOWN").toString(),
                helpers.utils.getFundingStageStateIdByName("IN_PROGRESS").toString(),
                helpers.utils.getFundingStageStateIdByName("FINAL").toString()
            );
            assert.isTrue(validation, 'State validation failed..');

        });

        it('is in COOLDOWN, ico start time passes, should Require change to IN_PROGRESS', async () => {
            tx = await TestBuildHelper.timeTravelTo( pre_ico_settings.start_time + 1 );
            tx = await assetContract.doStateChanges();

            let DirectPaymentValue = 1 * helpers.solidity.ether;
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet1});
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet2});

            tx = await TestBuildHelper.timeTravelTo( pre_ico_settings.end_time + 1 );
            tx = await assetContract.doStateChanges();

            tx = await TestBuildHelper.timeTravelTo( ico_settings.start_time + 1 );

            validation = await TestBuildHelper.ValidateFundingState(
                helpers.utils.getFundingEntityStateIdByName("COOLDOWN").toString(),
                helpers.utils.getFundingEntityStateIdByName("IN_PROGRESS").toString(),
                helpers.utils.getFundingStageStateIdByName("NEW").toString(),
                helpers.utils.getFundingStageStateIdByName("IN_PROGRESS").toString()
            );
            assert.isTrue(validation, 'State validation failed..');
        });

        it('handles ENTITY state change from COOLDOWN to IN_PROGRESS when next funding period time start has passed', async () => {

            tx = await TestBuildHelper.timeTravelTo( pre_ico_settings.start_time + 1 );
            tx = await assetContract.doStateChanges();

            let DirectPaymentValue = 1 * helpers.solidity.ether;
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet1});
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet2});

            tx = await TestBuildHelper.timeTravelTo( pre_ico_settings.end_time + 1 );
            tx = await assetContract.doStateChanges();

            tx = await TestBuildHelper.timeTravelTo( ico_settings.start_time + 1 );
            tx = await assetContract.doStateChanges();

            validation = await TestBuildHelper.ValidateFundingState(
                helpers.utils.getFundingEntityStateIdByName("IN_PROGRESS").toString(),
                helpers.utils.getFundingEntityStateIdByName("NONE").toString(),
                helpers.utils.getFundingStageStateIdByName("IN_PROGRESS").toString(),
                helpers.utils.getFundingStageStateIdByName("NONE").toString()
            );

            assert.isTrue(validation, 'State validation failed..');
        });


        it('is IN_PROGRESS, ico end time passes, should Require change to FUNDING_ENDED', async () => {

            tx = await TestBuildHelper.timeTravelTo( pre_ico_settings.start_time + 1 );
            tx = await assetContract.doStateChanges();

            let DirectPaymentValue = 1 * helpers.solidity.ether;
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet1});
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet2});

            tx = await TestBuildHelper.timeTravelTo( pre_ico_settings.end_time + 1 );
            tx = await assetContract.doStateChanges();

            tx = await TestBuildHelper.timeTravelTo( ico_settings.start_time + 1 );
            tx = await assetContract.doStateChanges();

            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet1});
            tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet2});

            tx = await TestBuildHelper.timeTravelTo( ico_settings.end_time + 1 );

            validation = await TestBuildHelper.ValidateFundingState(
                helpers.utils.getFundingEntityStateIdByName("IN_PROGRESS").toString(),
                helpers.utils.getFundingEntityStateIdByName("FUNDING_ENDED").toString(),
                helpers.utils.getFundingStageStateIdByName("IN_PROGRESS").toString(),
                helpers.utils.getFundingStageStateIdByName("FINAL").toString()
            );
            assert.isTrue(validation, 'State validation failed..');
        });

        context('handles ENTITY state change from IN_PROGRESS when last funding period time end has passed', async () => {

            it('to FAILED when payments did not reach soft cap', async () => {

                tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                tx = await assetContract.doStateChanges();

                let DirectPaymentValue = 1 * helpers.solidity.ether;
                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet1});
                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet2});

                tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.end_time + 1);
                tx = await assetContract.doStateChanges();

                tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                tx = await assetContract.doStateChanges();

                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet1});
                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet2});

                tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                tx = await assetContract.doStateChanges();

                // await helpers.utils.showDebugRequiredStateChanges(helpers, assetContract);

                validation = await TestBuildHelper.ValidateFundingState(
                    helpers.utils.getFundingEntityStateIdByName("FAILED").toString(),
                    helpers.utils.getFundingEntityStateIdByName("NONE").toString(),
                    helpers.utils.getFundingStageStateIdByName("FINAL").toString(),
                    helpers.utils.getFundingStageStateIdByName("NONE").toString()
                );
                assert.isTrue(validation, 'State validation failed..');
            });


            it('to SUCCESSFUL when payments reached soft cap', async () => {

                tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                tx = await assetContract.doStateChanges();

                let DirectPaymentValue = 5000 * helpers.solidity.ether;
                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet3});
                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet4});

                tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.end_time + 1);
                tx = await assetContract.doStateChanges();

                tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                tx = await assetContract.doStateChanges();

                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet3});
                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet4});

                tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);
                tx = await assetContract.doStateChanges();

                validation = await TestBuildHelper.ValidateFundingState(
                    helpers.utils.getFundingEntityStateIdByName("SUCCESSFUL").toString(),
                    helpers.utils.getFundingEntityStateIdByName("NONE").toString(),
                    helpers.utils.getFundingStageStateIdByName("FINAL").toString(),
                    helpers.utils.getFundingStageStateIdByName("NONE").toString()
                );
                assert.isTrue(validation, 'State validation failed..');
            });

        });


        context('handles ENTITY state change from IN_PROGRESS when stage Hard Cap is Reached', async () => {


            it('to COOLDOWN when payments reached hard cap in first funding stage (pre-ico)', async () => {
                tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                // tx = await assetContract.doStateChanges();
                await TestBuildHelper.doApplicationStateChanges("PRE ICO START", false);

                let DirectPaymentValue = 10000 * helpers.solidity.ether;
                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet3});

                await TestBuildHelper.doApplicationStateChanges("PRE END", false);

                validation = await TestBuildHelper.ValidateFundingState(
                    helpers.utils.getFundingEntityStateIdByName("COOLDOWN").toString(),
                    helpers.utils.getFundingEntityStateIdByName("NONE").toString(),
                    helpers.utils.getFundingStageStateIdByName("NEW").toString(),
                    helpers.utils.getFundingStageStateIdByName("NONE").toString()
                );
                assert.isTrue(validation, 'State validation failed..');

            });



            it('to SUCCESSFUL when payments reached hard cap in last funding stage (ico)', async () => {

                tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                await TestBuildHelper.doApplicationStateChanges("PRE ICO START", false);

                let DirectPaymentValue = 2000 * helpers.solidity.ether;
                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet3});
                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet4});

                // not really required since we're going to end up there by using a recursive doStateChanges()
                tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.end_time + 1);
                await TestBuildHelper.doApplicationStateChanges("PRE END", false);

                tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);
                await TestBuildHelper.doApplicationStateChanges("ICO START", false);

                DirectPaymentValue = 50000 * helpers.solidity.ether;
                tx = await FundingInputDirect.sendTransaction({value: DirectPaymentValue, from: investorWallet6});

                await TestBuildHelper.doApplicationStateChanges("ICO END", false);

                validation = await TestBuildHelper.ValidateFundingState(
                    helpers.utils.getFundingEntityStateIdByName("SUCCESSFUL_FINAL").toString(),
                    helpers.utils.getFundingEntityStateIdByName("NONE").toString(),
                    helpers.utils.getFundingStageStateIdByName("FINAL").toString(),
                    helpers.utils.getFundingStageStateIdByName("NONE").toString()
                );
                assert.isTrue(validation, 'State validation failed..');
            });



        });



        context('FundingManager Tasks', async () => {

            it('handles ENTITY state change from FAILED to FAILED_FINAL after FundingManager Task Process finished', async () => {

                // time travel to ico start time
                tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                tx = await assetContract.doStateChanges();

                // insert payments, under soft cap.
                tx = await TestBuildHelper.insertPaymentsIntoFunding(false);
                // time travel to end of ICO, and change states
                tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);

                tx = await assetContract.doStateChanges();
                tx = await assetContract.doStateChanges();

                validation = await TestBuildHelper.ValidateFundingState(
                    helpers.utils.getFundingEntityStateIdByName("FAILED").toString(),
                    helpers.utils.getFundingEntityStateIdByName("NONE").toString(),
                    helpers.utils.getFundingStageStateIdByName("FINAL").toString(),
                    helpers.utils.getFundingStageStateIdByName("NONE").toString()
                );
                assert.isTrue(validation, 'State validation failed..');

                await TestBuildHelper.doApplicationStateChanges("ICO END", false);

                validation = await TestBuildHelper.ValidateFundingState(
                    helpers.utils.getFundingEntityStateIdByName("FAILED_FINAL").toString(),
                    helpers.utils.getFundingEntityStateIdByName("NONE").toString(),
                    helpers.utils.getFundingStageStateIdByName("FINAL").toString(),
                    helpers.utils.getFundingStageStateIdByName("NONE").toString()
                );

            });

            it('handles ENTITY state change from SUCCESSFUL to SUCCESSFUL_FINAL after FundingManager Task Process finished', async () => {

                let FundingManager = await TestBuildHelper.getDeployedByName("FundingManager");

                // time travel to ico start time
                tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                await TestBuildHelper.doApplicationStateChanges("Pre ICO START", false);

                // insert payments, over soft cap.
                tx = await TestBuildHelper.insertPaymentsIntoFunding(true);

                // can insert payments into second stage too. but not required
                // time travel to start of ICO, and change states
                tx = await TestBuildHelper.timeTravelTo(ico_settings.start_time + 1);

                await TestBuildHelper.doApplicationStateChanges("ICO START", false);

                // insert payments, under soft cap.
                await TestBuildHelper.insertPaymentsIntoFunding(false, 3);

                // time travel to end of ICO, and change states
                tx = await TestBuildHelper.timeTravelTo(ico_settings.end_time + 1);

                // let ApplicationEntity = await TestBuildHelper.getDeployedByName("ApplicationEntity");
                // tx = await ApplicationEntity.doStateChanges();
                // await TestBuildHelper.displayAllVaultDetails();
                // await TestBuildHelper.FundingManagerProcessVaults(true, 1);

                await TestBuildHelper.doApplicationStateChanges("ICO END", false);

                validation = await TestBuildHelper.ValidateFundingState(
                    helpers.utils.getFundingEntityStateIdByName("SUCCESSFUL_FINAL").toString(),
                    helpers.utils.getFundingEntityStateIdByName("NONE").toString(),
                    helpers.utils.getFundingStageStateIdByName("FINAL").toString(),
                    helpers.utils.getFundingStageStateIdByName("NONE").toString()
                );
                assert.isTrue(validation, 'State validation failed..');

            });

        });

        context('misc for extra coverage', async () => {
            let tx;
            it('isFundingStageUpdateAllowed returns false if not allowed', async () => {

                tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                tx = await assetContract.doStateChanges();

                let allowed = await assetContract.isFundingStageUpdateAllowed.call(
                    helpers.utils.getFundingEntityStateIdByName("NEW")
                );
                assert.isFalse(allowed, 'isFundingStageUpdateAllowed should not allow invalid stage update');
            });

            it('should run doStateChanges even if no changes are required', async () => {
                tx = await TestBuildHelper.timeTravelTo(pre_ico_settings.start_time + 1);
                tx = await assetContract.doStateChanges();
                tx = await assetContract.doStateChanges();
            });
        });

        // receive some payments and move to COOLDOWN by updating time to after pre_ico
        // receive payments over hard cap, should move to funding ended
    });
};

