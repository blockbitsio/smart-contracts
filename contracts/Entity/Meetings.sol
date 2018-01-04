/*

 * @name        Meetings Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains the Meetings Contract code deployed and linked to the Application Entity

*/

pragma solidity ^0.4.17;

import "./../ApplicationAsset.sol";

contract Meetings is ApplicationAsset {
    /*
    function add() public view onlyOwner {
        // find out AppEntity delivery state and based on that decide if initiator has access to call this or not

    }
    */

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