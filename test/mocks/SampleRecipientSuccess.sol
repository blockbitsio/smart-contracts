/*
    https://github.com/ethereum/EIPs/issues/677
*/
pragma solidity ^0.4.17;


contract SampleRecipientSuccess {
    /* A Generic receiving function for contracts that accept tokens */
    address public from;
    uint256 public value;
    bytes public extraData;
    event ReceivedApproval(uint256 _value);

    function tokenCallback(address _from, uint256 _value) public returns (bool success) {
        from = _from;
        value = _value;
        ReceivedApproval(_value);
        return true;
    }
}