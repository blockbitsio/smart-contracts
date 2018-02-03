/*

 * source       https://github.com/blockbitsio/

 * @name        Meetings Contract ABI
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the Meetings Contract code deployed and linked to the Application Entity

*/

pragma solidity ^0.4.17;

import "./ABIApplicationAsset.sol";

contract ABIMeetings is ABIApplicationAsset {
    struct Record {
        bytes32 hash;
        bytes32 name;
        uint8 state;
        uint256 time_start;                     // start at unixtimestamp
        uint256 duration;
        uint8 index;
    }
    mapping (uint8 => Record) public Collection;
}