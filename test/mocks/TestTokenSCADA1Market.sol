/*

 * @name        TestTokenSCADAMarket
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

    For details see "../../contracts/Algorithm/TokenSCADAMarket.sol";

*/

pragma solidity 0.4.17;

import "../../contracts/Algorithms/TokenSCADA1Market.sol";

contract TestTokenSCADA1Market is TokenSCADA1Market {

    function
        TestTokenSCADA1Market (address _tokenContract, address _fundingContract )
        TokenSCADA1Market ( _tokenContract,  _fundingContract )
        TokenSCADAGeneric( _tokenContract,  _fundingContract )
        public
    {

    }


}