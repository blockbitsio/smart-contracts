/*

 * @name        Test Token Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/
pragma solidity ^0.4.17;

import "../../contracts/Entity/Token.sol";

contract TestToken is Token  {

    function TestToken(
        uint256 _initialAmount,
        string _tokenName,
        uint8 _decimalUnits,
        string _tokenSymbol,
        string _version
    )
        Token(
            _initialAmount,
            _tokenName,
            _decimalUnits,
            _tokenSymbol,
            _version
        )
        public
    {

    }
}
