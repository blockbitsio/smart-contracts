/*

 * source       https://github.com/blockbitsio/

 * @name        Application Entity Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the main company Entity Contract code deployed and linked to the Gateway Interface.

    * used for testing upgrade proposals.

*/

pragma solidity ^0.4.17;

import "./Entity/UpgradeTestAsset.sol";
import "./ApplicationEntity.sol";

contract ApplicationEntitySecond is ApplicationEntity {

    UpgradeTestAsset public UpgradeTestAssetEntity;

    function addAssetUpgradeTestAsset(address _assetAddresses) external requireNotInitialised onlyDeployer {
        UpgradeTestAssetEntity = UpgradeTestAsset(_assetAddresses);
        assetInitialized("UpgradeTestAsset", _assetAddresses);
    }

    function initializeNewAssetToThisApplication(bytes32 _name) external onlyDeployer returns (bool) {
        address current = AssetCollection[_name];
        if(current != address(0x0)) {
            if(!current.call(bytes4(keccak256("setInitialOwnerAndName(bytes32)")), _name) ) {
                revert();
            }
        } else {
            revert();
        }
        EventAppEntityInitAssetsToThis( AssetCollectionNum );

        return true;
    }

    // UPGRADED

    // use this when extending "has changes"
    function extendedAnyAssetHasChanges() internal view returns (bool) {
        return false;
    }

    // use this when extending "asset state processor"
    function extendedAssetProcessor() internal {

    }

}