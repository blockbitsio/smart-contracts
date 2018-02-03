/*

 * source       https://github.com/blockbitsio/

 * @name        Bounty Program Contract ABI
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

  Bounty program contract that holds and distributes tokens upon successful funding.

*/

pragma solidity ^0.4.17;

import "./ABIApplicationAsset.sol";

contract ABIBountyManager is ABIApplicationAsset {
    function sendBounty( address _receiver, uint256 _amount ) public;
}