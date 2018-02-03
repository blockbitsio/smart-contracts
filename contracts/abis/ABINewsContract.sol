/*

 * source       https://github.com/blockbitsio/

 * @name        News Contract ABI
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/

pragma solidity ^0.4.17;

import "./ABIApplicationAsset.sol";

contract ABINewsContract is ABIApplicationAsset {

    struct item {
        string hash;
        uint8 itemType;
        uint256 length;
    }

    uint256 public itemNum = 0;
    mapping ( uint256 => item ) public items;

    function addInternalMessage(uint8 state) public;
    function addItem(string _hash, uint256 _length) public;
}