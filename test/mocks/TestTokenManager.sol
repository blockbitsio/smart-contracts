/*

 * @name        Test Token Manager Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/
pragma solidity ^0.4.17;

import "../../contracts/Entity/TokenManager.sol";
import "./TestApplicationAsset.sol";

contract TestTokenManager is TokenManager, TestApplicationAsset  {

}
