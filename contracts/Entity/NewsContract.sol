/*

 * source       https://github.com/blockbitsio/

 * @name        News Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

 Contains This Application's News Items

*/

pragma solidity ^0.4.17;

import "./../ApplicationAsset.sol";
import "./../ApplicationEntityABI.sol";

contract NewsContract is ApplicationAsset {

    // state types
    // 1 - generic news item

    // 2 - FUNDING FAILED
    // 3 - FUNDING SUCCESSFUL
    // 4 - MEETING DATE AND TIME SET
    // 5 - VOTING INITIATED

    // 10 - GLOBAL CASHBACK AVAILABLE
    // 50 - CODE UPGRADE PROPOSAL INITIATED

    // 100 - DEVELOPMENT COMPLETE, HELLO SKYNET

    // news items
    struct item {
        string hash;
        uint8 itemType;
        uint256 length;
    }

    mapping ( uint256 => item ) public items;
    uint256 public itemNum = 0;

    event EventNewsItem(string _hash);
    event EventNewsState(uint8 itemType);

    function NewsContract() ApplicationAsset() public {

    }

    function addInternalMessage(uint8 state) public requireInitialised {
        require(msg.sender == owner); // only application
        item storage child = items[++itemNum];
        child.itemType = state;
        EventNewsState(state);
    }

    function addItem(string _hash, uint256 _length) public onlyAppDeployer requireInitialised {
        item storage child = items[++itemNum];
        child.hash = _hash;
        child.itemType = 1;
        child.length = _length;
        EventNewsItem(_hash);
    }

    modifier onlyAppDeployer() {
        ApplicationEntityABI currentApp = ApplicationEntityABI(owner);
        require(msg.sender == currentApp.deployerAddress());
        _;
    }
}