/*

 * @name        Direct Funding Input Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/

pragma solidity ^0.4.17;

import "../../contracts/Inputs/FundingInputMilestone.sol";

contract TestFundingInputMilestone is FundingInputMilestone {

    function setTestFundingAssetAddress(address _addr) public {
        FundingAssetAddress = _addr;
    }

    function setTestFundingAssetAddressToZero() public {
        FundingAssetAddress = address(0x0);
    }
}
