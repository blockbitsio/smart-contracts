/*

 * @name        Test News Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/
pragma solidity ^0.4.17;

import "../../contracts/Entity/NewsContract.sol";
import "./TestApplicationAsset.sol";

contract TestNewsContract is NewsContract, TestApplicationAsset {


}
