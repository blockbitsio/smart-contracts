/*

 * source       https://github.com/blockbitsio/

 * @name        General Funding Input Contract ABI
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/

pragma solidity ^0.4.17;

contract ABIFundingInputGeneral {

    bool public initialized = false;
    uint8 public typeId;
    address public FundingAssetAddress;

    event EventInputPaymentReceived(address sender, uint amount, uint8 _type);

    function setFundingAssetAddress(address _addr) public;
    function () public payable;
    function buy() public payable returns(bool);
}
