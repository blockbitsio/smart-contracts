/*

 * @name        TestTokenSCADAMarket
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

*/
pragma solidity 0.4.17;

import "../../contracts/Algorithms/TokenSCADAVariable.sol";

contract TestTokenSCADAVariable is TokenSCADAVariable {

    function
        TestTokenSCADAVariable ( address _fundingContract )
        TokenSCADAVariable ( _fundingContract )
        public
    {

    }


}