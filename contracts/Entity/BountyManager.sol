/*

 * @name        Bounty Program Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

    Bounty program contract that holds and distributes tokens upon successful funding.
*/

pragma solidity ^0.4.17;

import "./../ApplicationAsset.sol";
import "./Token.sol";
import "./TokenManager.sol";
import "./Funding.sol";

contract BountyManager is ApplicationAsset {

    Funding FundingEntity;
    Token TokenEntity;

    function runBeforeApplyingSettings()
        internal
        requireInitialised
        requireSettingsNotApplied
    {
        address FundingAddress = getApplicationAssetAddressByName('Funding');
        FundingEntity = Funding(FundingAddress);

        address TokenManagerAddress = getApplicationAssetAddressByName('TokenManager');
        TokenManager TokenManagerEntity = TokenManager(TokenManagerAddress);
        TokenEntity = Token(TokenManagerEntity.TokenEntity());

        EventRunBeforeApplyingSettings(assetName);
    }

    function sendBounty( address _receiver, uint256 _amount )
        public
        requireInitialised
        requireSettingsApplied
        onlyDeployer
    {
        if( FundingEntity.CurrentEntityState() == FundingEntity.getEntityState("SUCCESSFUL_FINAL") ) {
            TokenEntity.transfer( _receiver, _amount );
        } else {
            revert();
        }
    }
}