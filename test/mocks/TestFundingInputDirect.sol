/*

 * @name        Direct Funding Input Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/

pragma solidity ^0.4.17;

import "../../contracts/Inputs/FundingInputDirect.sol";

contract TestFundingInputDirect is FundingInputDirect {

    function setTestFundingAssetAddress(address _addr) public {
        FundingAssetAddress = _addr;
    }

    function setTestFundingAssetAddressToZero() public {
        FundingAssetAddress = address(0x0);
    }
}
