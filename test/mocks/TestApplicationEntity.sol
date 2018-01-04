/*

 * @name        Test Gateway Interface Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/
pragma solidity ^0.4.17;

import "../../contracts/ApplicationEntity.sol";

contract TestApplicationEntity is ApplicationEntity {

    function setTestInitialized() external {
        _initialized = true;
    }

    function setTestGatewayInterfaceEntity(address _address) external {
        GatewayInterfaceAddress = _address;
        GatewayInterfaceEntity = GatewayInterface(GatewayInterfaceAddress);
    }

    function callTestApproveCodeUpgrade(address _address) external {
        GatewayInterfaceEntity.approveCodeUpgrade(_address);
    }

    function callTestAssetTransferToNewOwner(address _address, address _newOwner) external returns (bool) {
        return _address.call(bytes4(keccak256("transferToNewOwner(address)")), _newOwner);
    }

    function setTestAsset(bytes32 name, address _assetAddresses) external {
        AssetCollectionIdToName[AssetCollectionNum] = name;
        AssetCollection[name] = _assetAddresses;
        AssetCollectionNum++;
    }

    function callTestRequestCodeUpgrade(address _address, bytes32 _source) external {
        GatewayInterfaceEntity.requestCodeUpgrade(_address, _source);
    }

    function callTestListingContractAddItem(bytes32 _name, address _address) external {
        ListingContractEntity.addItem(_name, _address);
    }

    function callTestNewsContractAddInternalMessage(uint8 state) external {
        NewsContractEntity.addInternalMessage(state);
    }

    function callTestAddCodeUpgradeProposal(address _addr, bytes32 _sourceCodeUrl) external returns (uint256) {
        return ProposalsEntity.addCodeUpgradeProposal(_addr, _sourceCodeUrl);
    }

    uint256 _mockTime = now;
    function getTimestamp() view public returns (uint256) {
        if(_mockTime > 0) {
            return _mockTime;
        } else {
            return now;
        }
    }
    function setTestTimestamp(uint256 i) external { _mockTime = i; }

    function addTestUpgradeAllowAddress(address _addr) external {
        testAddressAllowUpgradeFrom = _addr;
    }
}
