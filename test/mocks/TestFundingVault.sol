/*

 * @name        Test Funding Vault
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/

pragma solidity ^0.4.17;

import "../../contracts/Entity/FundingVault.sol";

contract TestFundingVault is FundingVault{

    function setTestInitialized() public {
        _initialized = true;
    }
}