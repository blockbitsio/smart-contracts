/*

 * @name        Token Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Zeppelin ERC20 Standard Token

*/

pragma solidity ^0.4.17;

import "./../ApplicationAsset.sol";

contract UpgradeTestAsset is ApplicationAsset {

    address public fundingContractAddress;

    function runBeforeApplyingSettings()
        internal
        requireInitialised
        requireSettingsNotApplied
    {
        // testing if we can get real Funding asset address
        fundingContractAddress = getApplicationAssetAddressByName('Funding');
        EventRunBeforeApplyingSettings(assetName);
    }

}