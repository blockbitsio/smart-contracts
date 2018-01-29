/*

 * @name        Token Stake Calculation And Distribution Algorithm - Type 1 - Market decides token value
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>


    **Inputs:**

    - Defined Total Supply of tokens available in Current Funding Phase
    - Received amount of ETH
    - Minimum parity `( optional )`

    **Provides:**

    - Parity with [ETH](#) `( calculated by amount divided by total supply => 1 Token = X ETH )`


    **Observations:**

    - Will sell the whole supply of Tokens available to Current Funding Phase
    - If minimum parity is provided and not reached, token allocation is done using provided parity parameter and
    remaining tokens are distributed to all participants in all Completed Funding Phases in order to maintain
    stake sharing `( as a result excludes Project Owner )`.


    **Use cases:**
    - Minimum parity not present - usable only in the First Funding Phase, where you want the market to determine
    your token price.
    - Minimum parity used from previous Funding Phase - enabled for usage only after at least 1 Funding Phase where
    parity was determined.


    // Explained:

	Our offering has 2 Funding Phases, a PRE ICO Phase, and an ICO Phase. These
Phases are only limited by time and the hard cap.

    Pre ICO token allocation is 10%, non guaranteed discount starts at 25%
    ICO token allocation is 40%
    Global Token Sale allocation totals: 50% (PRE ICO + ICO)

	There are no guaranteed discounts and token amounts, they are decided by
actual participation into the sale.
    This means Hard cap can be reached in the PRE ICO if demand is as such.

    This can be quite hard to grasp, so here are the details:

    Once Hard Cap, or Funding Phase Time is reached we have 2 cases:
	Case 1:
	- Hard cap is reached in PRE ICO, the whole token allocation ( Global Token
Sale allocation ) is distributed to investors and Funding is complete. No other
Funding Phases will take place.

	Case 2:
	- Hard cap is not reached.
	Based on raised amount of ether, and the token allocated to PRE ICO Funding
Phase, we calculate the Parity ( raised amount divided by token supply ) of the
next Funding Phase ( ICO ). We call this PRE ICO - TOKEN PRICE.

    Said parity plus non guaranteed discount is used as the starting floor price
for selling tokens in the next Funding Phase (ICO Phase).
    We call this ICO START PRICE.

    Once Hard Cap, or Funding Phase Time is reached we have 2 new cases:

    Case 2.1: Global Funding reached Soft Cap:
    - Buy orders in PRE ICO Phase, will be awarded tokens using PRE ICO - TOKEN
PRICE.

    - We calculate ICO Phase parity. ( raised amount divided by token supply )
    - If resulting parity is lower than ICO START PRICE then ICO - TOKEN PRICE
is ICO START PRICE.
    - If resulting parity is higher than ICO START PRICE then ICO - TOKEN PRICE
is Resulting Parity.

    - For buy orders in ICO Phase, Tokens will be allocated using ICO - TOKEN
PRICE.

    - After ICO Token allocation, if any tokens remain unsold, they are
distributed to ALL Funding Participants. This excludes the Project's Team in order
to maintain the token share balances to 50% team / 50% investors.



*/

pragma solidity 0.4.17;

import "./TokenSCADAGeneric.sol";

contract TokenSCADA1Market is TokenSCADAGeneric {

    // __constructor, passes arguments to parent constructor
    function
        TokenSCADA1Market (address _tokenContract, address _fundingContract )
        TokenSCADAGeneric( _tokenContract,  _fundingContract )
        public
    {
        // this algorithm needs hard cap on funding phases to not exist!
        SCADA_requires_hard_cap = false;
    }

}