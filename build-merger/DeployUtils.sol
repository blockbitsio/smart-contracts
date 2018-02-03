pragma solidity ^0.4.17;

contract DeployUtils {
    function getBalance(address _address) public view returns (uint256) {
        return _address.balance;
    }
}