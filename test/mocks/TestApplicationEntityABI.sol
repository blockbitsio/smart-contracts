/*

 * @name        Test Gateway Interface Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/
pragma solidity ^0.4.17;

import "../../contracts/ApplicationEntityABI.sol";

contract TestApplicationEntityABI is ApplicationEntityABI {
    function getTimestamp() view public returns (uint256);
}
