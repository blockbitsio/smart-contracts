module.exports = function(setup) {
    let helpers = setup.helpers;
    let contracts = setup.contracts;
    let settings = setup.settings;
    let assetContractNames = setup.assetContractNames;

    contract('Application Entity', accounts => {
        let app, app2, gateway = {};

        beforeEach(async () => {
            app = await contracts.ApplicationEntity.new();
            gateway = await contracts.GatewayInterface.new();
        });

        it('initializes with empty properties', async () => {
            assert.equal(await app.getParentAddress.call(), 0x0, 'parent address should be empty');
            assert.isFalse(await app._initialized.call(), false, '_initialized should be false');
        });

        it('initializes with deployer address properly', async () => {
            let app2 = await contracts.ApplicationEntity.new({from: accounts[5]});
            assert.equal(await app2.deployerAddress.call(), accounts[5], 'deployerAddress address should be accounts[5]');
        });

        context('setBylawBytes32()', async () => {
            let bylaw_name = "test_bylaw";
            let bylaw_value = "value";

            it('sets and returns a bylaw bytes32 if not initialized', async () => {
                await app.setBylawBytes32(bylaw_name, helpers.web3util.toHex(bylaw_value) );
                await app.setTestGatewayInterfaceEntity(gateway.address);
                await gateway.setTestCurrentApplicationEntityAddress(app.address);
                let eventFilter = helpers.utils.hasEvent(
                    await gateway.callTestApplicationEntityInitialize(),
                    'EventAppEntityReady(address)'
                );
                assert.equal(eventFilter.length, 1, 'EventAppEntityReady event not received.');
                assert.isTrue(await app._initialized.call(), '_initialized should be true');

                let testValue = await app.getBylawBytes32.call(bylaw_name);
                testValue = helpers.web3util.toUtf8(testValue);
                assert.equal(testValue, bylaw_value, 'Value should match');
            });

            it('throws if if application is already initialized', async () => {
                await app.setTestGatewayInterfaceEntity(gateway.address);
                await app.setTestInitialized();
                assert.isTrue(await app._initialized.call(), '_initialized should be true');
                return helpers.assertInvalidOpcode(async () => {
                    await app.setBylawBytes32(bylaw_name, helpers.web3util.toHex(bylaw_value) );
                });
            });
        });

        context('getBylawBytes32()', async () => {
            let bylaw_name = "test_bylaw";
            let bylaw_value = "testValue";

            it('throws if application is not initialized', async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await app.getBylawBytes32(bylaw_name);
                });
            });

            it('returns correct value set by setBylawBytes32 if application is initialized', async () => {
                await app.setBylawBytes32(bylaw_name, helpers.web3util.toHex(bylaw_value));
                await app.setTestGatewayInterfaceEntity(gateway.address);
                await app.setTestInitialized();
                let val = helpers.web3util.toUtf8( await app.getBylawBytes32.call(bylaw_name) );
                assert.equal(val, bylaw_value, "Value should be "+bylaw_value);
            });
        });

        context('setBylawUint256()', async () => {
            let bylaw_name = "test_bylaw";
            let bylaw_value = 12345;

            it('sets and returns a bylaw uint256 if not initialized', async () => {
                await app.setBylawUint256(bylaw_name, bylaw_value );
                await app.setTestGatewayInterfaceEntity(gateway.address);
                await gateway.setTestCurrentApplicationEntityAddress(app.address);
                let eventFilter = helpers.utils.hasEvent(
                    await gateway.callTestApplicationEntityInitialize(),
                    'EventAppEntityReady(address)'
                );
                assert.equal(eventFilter.length, 1, 'EventAppEntityReady event not received.');
                assert.isTrue(await app._initialized.call(), '_initialized should be true');

                let testValue = await app.getBylawUint256.call(bylaw_name);
                assert.equal(testValue, bylaw_value, 'Value should match');
            });

            it('throws if if application is already initialized', async () => {
                await app.setTestGatewayInterfaceEntity(gateway.address);
                await app.setTestInitialized();
                assert.isTrue(await app._initialized.call(), '_initialized should be true');
                return helpers.assertInvalidOpcode(async () => {
                    await app.setBylawUint256(bylaw_name, helpers.web3util.toHex(bylaw_value) );
                });
            });
        });

        context('application bylaws validation', async () => {

            it('sets and returns all string and uint256 bylaws', async () => {

                let TestBuildHelper = new helpers.TestBuildHelper(setup, assert, accounts);
                // link to real gateway
                await TestBuildHelper.linkToRealGateway();
                let assetContract = await TestBuildHelper.deployAndInitializeAsset( "NewsContract" );

                // application is initialized and should have all bylaws set
                let application = await TestBuildHelper.getDeployedByName("ApplicationEntity");

                assert.isTrue(await application._initialized.call(), '_initialized should be true');

                for (let key in settings.bylaws) {
                    let returnedValue;
                    let value = settings.bylaws[key];

                    // string bylaw
                    if(typeof value === "string") {
                        returnedValue = await application.getBylawBytes32.call(key);
                        returnedValue = await helpers.web3util.toUtf8(returnedValue);
                    } else {
                        // uints and booleans
                        // convert booleans to 1 / 0
                        if(typeof value === "boolean") {
                            if(value === true) {
                                value = 1;
                            } else {
                                value = 0;
                            }
                        }
                        returnedValue = await application.getBylawUint256.call(key);
                    }

                    // validate returned value
                    assert.equal(returnedValue.toString(), value.toString(), 'Value should match');
                }
            });
        });

        context('getBylawUint256()', async () => {
            let bylaw_name = "test_bylaw";
            let bylaw_value = 12345;

            it('throws if application is not initialized', async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await app.getBylawUint256(bylaw_name);
                });
            });

            it('returns correct value set by setBylaw if application is initialized', async () => {
                await app.setBylawUint256(bylaw_name, bylaw_value);
                await app.setTestGatewayInterfaceEntity(gateway.address);
                await app.setTestInitialized();
                let val = await app.getBylawUint256.call(bylaw_name);
                assert.equal(val, bylaw_value, "Value should be "+bylaw_value);
            });

        });

        context('initialize()', async () => {
            beforeEach(async () => {
                gateway = await contracts.GatewayInterface.new();
            });

            it('throws if called when already initialized', async () => {
                await app.setTestGatewayInterfaceEntity(gateway.address);
                await app.setTestInitialized();
                return helpers.assertInvalidOpcode(async () => {
                    await app.initialize()
                });
            });

            it('throws if called with owner missing ( gateway )', async () => {
                await app.setTestInitialized();
                return helpers.assertInvalidOpcode(async () => {
                    await app.initialize()
                });
            });

            it('works if owner is set, and it\'s the one calling', async () => {
                await app.setTestGatewayInterfaceEntity(gateway.address);
                await gateway.setTestCurrentApplicationEntityAddress(app.address);
                let eventFilter = helpers.utils.hasEvent(
                    await gateway.callTestApplicationEntityInitialize(),
                    'EventAppEntityReady(address)'
                );
                assert.equal(eventFilter.length, 1, 'EventAppEntityReady event not received.')
            });
        });


        context('initializeAssetsToThisApplication()', async () => {
            beforeEach(async () => {
                gateway = await contracts.GatewayInterface.new();
            });

            it('throws if not an asset', async () => {
                // gateway is accounts[0].. deployment account
                await app.setTestGatewayInterfaceEntity(accounts[0]);

                let emptystub = await contracts.EmptyStub.new();
                await app.setTestAsset("Test", emptystub.address);

                // should revert in app @ call setInitialOwnerAndName as it is missing in the empty stub
                return helpers.assertInvalidOpcode(async () => {
                    await app.initializeAssetsToThisApplication();
                });
            });

            it('throws if any asset has a 0x0 address', async () => {
                await app.setTestGatewayInterfaceEntity(gateway.address);

                await app.setTestAsset("Test", 0);

                // should revert in app @ call setInitialOwnerAndName as it is missing in the empty stub
                return helpers.assertInvalidOpcode(async () => {
                    await app.initializeAssetsToThisApplication();
                });
            });

            it('throws if caller is not gateway', async () => {
                await app.setTestGatewayInterfaceEntity(gateway.address);

                // should revert in app @ call setInitialOwnerAndName as it is missing in the empty stub
                return helpers.assertInvalidOpcode(async () => {
                    await app.initializeAssetsToThisApplication();
                });
            });
        });

        context('acceptCodeUpgradeProposal()', async () => {
            beforeEach(async () => {
                gateway = await contracts.GatewayInterface.new();
            });

            it('throws if caller is not Proposals Asset', async () => {
                await app.setTestGatewayInterfaceEntity(gateway.address);
                let app2 = await contracts.ApplicationEntity.new();
                return helpers.assertInvalidOpcode(async () => {
                    await app.acceptCodeUpgradeProposal(app2.address);
                });
            });
        });


        context('lock()', async () => {
            beforeEach(async () => {
                gateway = await contracts.GatewayInterface.new();
            });

            it('throws if sender is not gateway', async () => {
                return helpers.assertInvalidOpcode(async () => {
                    await app.lock()
                });
            });

            it('works if sender is gateway', async () => {
                await app.setTestGatewayInterfaceEntity(gateway.address);
                await gateway.setTestCurrentApplicationEntityAddress(app.address);
                let eventFilter = helpers.utils.hasEvent(
                    await gateway.callTestLockCurrentApp()
                    , 'EventAppEntityLocked(address)'
                );
                assert.equal(eventFilter.length, 1, 'EventAppEntityLocked event not received.')
            });
        });

        context('linkToGateway()', async () => {
            beforeEach(async () => {
                gateway = await contracts.GatewayInterface.new();
            });

            it('throws if called when owner already exists', async () => {
                await app.setTestGatewayInterfaceEntity(gateway.address);
                return helpers.assertInvalidOpcode(async () => {
                    await app.linkToGateway(gateway.address, settings.sourceCodeUrl)
                });
            });

            it('throws if called when already initialized', async () => {
                await app.setTestInitialized();
                return helpers.assertInvalidOpcode(async () => {
                    await app.linkToGateway(gateway.address, settings.sourceCodeUrl)
                });
            });

            it('will emit EventAppEntityReady on initial linking', async () => {
                let eventFilter = helpers.utils.hasEvent(
                    await app.linkToGateway(gateway.address, settings.sourceCodeUrl)
                    , 'EventAppEntityReady(address)'
                );
                assert.equal(eventFilter.length, 1, 'EventApplicationReady event not received.')
            });

            it('will emit EventNewProposalCreated if a previous ApplicationEntity is already linked', async () => {
                let proposals = await contracts.Proposals.new();
                await proposals.setInitialApplicationAddress(app.address);
                await app.addAssetProposals(proposals.address);
                await app.linkToGateway(gateway.address, settings.sourceCodeUrl);
                app2 = await contracts.ApplicationEntity.new();
                let eventFilter = await helpers.utils.hasEvent(
                    await app2.linkToGateway(gateway.address, settings.sourceCodeUrl),
                    'EventNewProposalCreated(bytes32,uint256)'
                );
                assert.equal(eventFilter.length, 1, 'EventNewProposalCreated event not received.')
            });
        });

        context('addAsset[AssetName]()', async () => {
            beforeEach(async () => {
                gateway = await contracts.GatewayInterface.new();
            });

            it('throws if called when already initialized', async () => {
                await app.setTestInitialized();
                let asset = assetContractNames[0];
                let contract = await helpers.getContract("Test" + asset).new();
                return helpers.assertInvalidOpcode(async () => {
                    let assetInsertionTx = await app["addAsset" + asset](contract.address);
                });
            });

            it('throws if called by any other address than initial deployer', async () => {
                let asset = assetContractNames[0];
                let contract = await helpers.getContract("Test" + asset).new();
                return helpers.assertInvalidOpcode(async () => {
                    let assetInsertionTx = await app["addAsset" + asset](contract.address, {from: accounts[1]});
                });
            });

            it('linking an asset will emit EventAppEntityInitAsset event', async () => {
                let asset = assetContractNames[0];
                let contract = await helpers.getContract("Test" + asset).new();
                let assetInsertionTx = await app["addAsset" + asset](contract.address);
                let eventFilter = helpers.utils.hasEvent(assetInsertionTx, 'EventAppEntityInitAsset(bytes32,address)');
                assert.equal(eventFilter.length, 1, 'EventAppEntityInitAsset event not received.')
            });

            it('linking all assets will emit the same number of EventAppEntityInitAsset events', async () => {
                let eventCollection = await Promise.all(assetContractNames.map(async (asset) => {
                    let contract = await helpers.getContract("Test" + asset).new();
                    let assetInsertionTx = await app["addAsset" + asset](contract.address);
                    return helpers.utils.hasEvent(assetInsertionTx, 'EventAppEntityInitAsset(bytes32,address)');
                }));
                assert.equal(eventCollection.length, assetContractNames.length, 'EventAppEntityInitAsset event not received.')
            });

            it('linking an asset, then linking the same asset again, will replace it in mapping', async () => {
                let asset = assetContractNames[0];
                let contract = await helpers.getContract("Test" + asset).new();
                let contract2 = await helpers.getContract("Test" + asset).new();

                let assetInsertionTx = await app["addAsset" + asset](contract.address);
                let eventFilter = helpers.utils.hasEvent(assetInsertionTx, 'EventAppEntityInitAsset(bytes32,address)');
                assert.equal(eventFilter.length, 1, 'EventAppEntityInitAsset event not received.');

                let initialAddress = await app.AssetCollection.call(asset);

                let assetInsertionTx2 = await app["addAsset" + asset](contract2.address);
                eventFilter = helpers.utils.hasEvent(assetInsertionTx, 'EventAppEntityInitAsset(bytes32,address)');
                assert.equal(eventFilter.length, 1, 'EventAppEntityInitAsset event not received.');

                let newAddress = await app.AssetCollection.call(asset);

                assert.equal(newAddress, contract2.address, 'newAddress should match contract address.')
                assert.notEqual(initialAddress, newAddress, 'newAddress should replace old one.');

            });

        });

    });
};