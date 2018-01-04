module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;

    contract('Gateway Interface', accounts => {
        let gateway = {};

        beforeEach(async () => {
            gateway = await contracts.GatewayInterface.new();
        });

        it('initializes with empty properties', async () => {
            assert.equal( await gateway.getApplicationAddress.call() , 0x0, 'address should be empty');
        });

        context('requestCodeUpgrade()', async () => {
            let testapp, emptystub, testapp2 = {};

            beforeEach(async () => {
                emptystub = await contracts.EmptyStub.new();
                testapp = await contracts.ApplicationEntity.new();
            });

            it('throws if address is empty ( 0x0 )', async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await gateway.requestCodeUpgrade(0x0, settings.sourceCodeUrl)
                })
            });

            it('throws if calling object misses the initialize() method', async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await gateway.requestCodeUpgrade(emptystub.address, settings.sourceCodeUrl)
                })
            });

            it('throws if current Application cannot initialize Assets properly', async () => {
                let appBad = await helpers.getContract("TestApplicationEntityBad").new();
                return helpers.assertInvalidOpcode(async () => {
                    await appBad.linkToGateway(gateway.address, settings.sourceCodeUrl);
                });
            });

            /*
            it('throws if current Application cannot transfer assets to new application', async () => {
                let appBad = await helpers.getContract("TestApplicationEntityBad").new();
                let proposals = await contracts.Proposals.new();
                await appBad.addAssetProposals(proposals.address);
                await appBad.setTestInitializeAssetsResponse(true);
                await appBad.setTestGatewayInterfaceEntity(gateway.address);
                return helpers.assertInvalidOpcode(async () => {
                    await gateway.requestCodeUpgrade(appBad.address, settings.sourceCodeUrl);
                });
            });

            */

            it('links Application if valid', async () => {
                await testapp.setTestGatewayInterfaceEntity(gateway.address);
                const eventFilter = helpers.utils.hasEvent(
                    await testapp.callTestRequestCodeUpgrade(testapp.address, settings.sourceCodeUrl),
                    'EventGatewayNewAddress(address)'
                );
                assert.equal(eventFilter.length, 1, 'EventGatewayNewAddress event not received.')
            });

            it('creates "Upgrade Proposal" if a previous Application is already linked', async () => {
                let proposals = await contracts.Proposals.new();
                await proposals.setInitialApplicationAddress(testapp.address);
                await testapp.addAssetProposals(proposals.address);
                await testapp.linkToGateway(gateway.address, settings.sourceCodeUrl);
                testapp2 = await contracts.ApplicationEntity.new();
                await testapp2.setTestGatewayInterfaceEntity(gateway.address);
                const eventFilter = helpers.utils.hasEvent(
                    await testapp2.callTestRequestCodeUpgrade(testapp2.address, settings.sourceCodeUrl),
                    'EventNewProposalCreated(bytes32,uint256)'
                );
                assert.equal(eventFilter.length, 1, 'EventNewProposalCreated event not received.')
            })
        });

        context('approveCodeUpgrade()', async () => {
            let testapp, emptystub = {};

            beforeEach(async () => {
                emptystub = await contracts.EmptyStub.new();
                testapp = await contracts.ApplicationEntity.new();
            });

            it('throws if sender is not current Application', async () => {
                await gateway.setTestCurrentApplicationEntityAddress(0x01);
                return helpers.assertInvalidOpcode(async () => {
                    await gateway.approveCodeUpgrade(emptystub.address)
                });
            });

            it('works if sender is current Application', async () => {
                let proposals = await contracts.Proposals.new();
                await proposals.setInitialApplicationAddress(testapp.address);
                await testapp.addAssetProposals(proposals.address);
                await testapp.linkToGateway(gateway.address, settings.sourceCodeUrl);
                let testapp2 = await contracts.ApplicationEntity.new();
                await testapp2.setTestGatewayInterfaceEntity(gateway.address);
                let approveTx = await testapp.callTestApproveCodeUpgrade(testapp2.address);
                let eventFilter = helpers.utils.hasEvent(
                    approveTx,
                    'EventGatewayNewAddress(address)'
                );
                assert.equal(eventFilter.length, 1, 'EventGatewayNewAddress event not received.')
                eventFilter = helpers.utils.hasEvent(
                    approveTx,
                    'EventAppEntityAssetsToNewApplication(address)'
                );
                assert.equal(eventFilter.length, 1, 'EventAppEntityAssetsToNewApplication event not received.')
    
            });

            it('throws if current Application cannot transfer assets to new application', async () => {
                let appBad = await helpers.getContract("TestApplicationEntityBad").new();
                let proposals = await contracts.Proposals.new();
                await proposals.setInitialApplicationAddress(appBad.address);
                await appBad.addAssetProposals(proposals.address);
                await appBad.setTestInitializeAssetsResponse(true);
                await appBad.setTestTransferResponse(false);
                await appBad.setTestGatewayInterfaceEntity(gateway.address);

                return helpers.assertInvalidOpcode(async () => {
                    await gateway.requestCodeUpgrade(appBad.address, settings.sourceCodeUrl);
                });
            });


            it('throws if current Application cannot initialize new application', async () => {

                let proposals = await contracts.Proposals.new();
                let appBad = await helpers.getContract("TestApplicationEntityBad").new();
                await proposals.setInitialApplicationAddress(appBad.address);
                await appBad.addAssetProposals(proposals.address);
                await appBad.setTestInitializeAssetsResponse(true);
                await appBad.setTestTransferResponse(true);
                await appBad.setTestTestLockResponse(true);
                await appBad.setTestInitializeResponse(true);
                await appBad.linkToGateway(gateway.address, settings.sourceCodeUrl);
                let testapp2 = await helpers.getContract("TestApplicationEntityBad").new();
                await testapp2.setTestGatewayInterfaceEntity(gateway.address);

                return helpers.assertInvalidOpcode(async () => {
                    await appBad.callTestApproveCodeUpgrade(testapp2.address);
                });
            });


            it('throws if current Application cannot lock itself after transferring assets', async () => {

                let proposals = await contracts.Proposals.new();
                let appBad = await helpers.getContract("TestApplicationEntityBad").new();
                await proposals.setInitialApplicationAddress(appBad.address);
                await appBad.addAssetProposals(proposals.address);
                await appBad.setTestInitializeAssetsResponse(true);
                await appBad.setTestTransferResponse(true);
                await appBad.setTestInitializeResponse(true);
                await appBad.linkToGateway(gateway.address, settings.sourceCodeUrl);
                let testapp2 = await helpers.getContract("TestApplicationEntityBad").new();
                await testapp2.setTestGatewayInterfaceEntity(gateway.address);
                await appBad.setTestTestLockResponse(false);

                return helpers.assertInvalidOpcode(async () => {
                    await appBad.callTestApproveCodeUpgrade(testapp2.address);
                });
            });

            context('misc for extra coverage', async () => {
                let TestBuildHelper, GatewayInterface;
                let platformWalletAddress = accounts[19];

                beforeEach(async () => {
                    TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts, platformWalletAddress);
                    await TestBuildHelper.linkToRealGateway();
                    await TestBuildHelper.deployAndInitializeApplication();
                    await TestBuildHelper.AddAllAssetSettingsAndLock();
                    GatewayInterface = await TestBuildHelper.getDeployedByName("GatewayInterface");
                });

                it('getNewsContractAddress returns actual linked NewsContract Asset address', async () => {
                    let NewsContractAsset = await TestBuildHelper.getDeployedByName("NewsContract");
                    let checkAddress = await GatewayInterface.getNewsContractAddress.call();
                    assert.equal( NewsContractAsset.address, checkAddress, "News contract address does not match!");
                });

                it('getListingContractAddress returns actual linked ListingContract Asset address', async () => {
                    let ListingContractAsset = await TestBuildHelper.getDeployedByName("ListingContract");
                    let checkAddress = await GatewayInterface.getListingContractAddress.call();
                    assert.equal( ListingContractAsset.address, checkAddress, "News contract address does not match!");
                });

            });
        });
    });
};