/*

 * source       https://github.com/blockbitsio/

 * @name        Token Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

  Mintable ERC20 Standard Token

*/

pragma solidity ^0.4.17;

import '../zeppelin/token/ERC20/MintableToken.sol';


/**
 * @title Burnable Token
 * @dev Token that can be irreversibly burned (destroyed).
 */
contract BurnableToken is BasicToken {

    event Burn(address indexed burner, uint256 value);

    /**
     * @dev Burns a specific amount of tokens.
     * @param _value The amount of token to be burned.
     */
    function burn(uint256 _value) public {
        require(_value <= balances[msg.sender]);

        address burner = msg.sender;
        balances[burner] = balances[burner].sub(_value);
        totalSupply_ = totalSupply_.sub(_value);
        Burn(burner, _value);
    }
}

contract Token is MintableToken, BurnableToken {

    string public name;
    string public symbol;
    string public version;
    uint8 public decimals;
    uint256 totalSupply_;

    function Token() public {
        decimals = 18;                             // Amount of decimals for display purposes
        totalSupply_ = 0;                          // Set initial supply.. should be 0 if we're minting
        name = "BlockBitsIO Token";                // Set the name for display purposes
        symbol = "BBX";                            // Set the symbol for display purposes
        version = "1";                             // Set token version string
    }

}

