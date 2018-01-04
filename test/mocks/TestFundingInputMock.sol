/*

 * @name        Direct Funding Input Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/

pragma solidity ^0.4.17;

import "../../contracts/Inputs/FundingInputGeneral.sol";

contract TestFundingInputMock is FundingInputGeneral {
    function TestFundingInputMock() FundingInputGeneral public {
        typeId = 99;
    }

    function setTestFundingAssetAddress(address _addr) public {
        FundingAssetAddress = _addr;
    }

    function setTestFundingAssetAddressToZero() public {
        FundingAssetAddress = address(0x0);
    }
}
