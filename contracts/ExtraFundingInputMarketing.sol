/*

 * source       https://github.com/blockbitsio/

 * @name        Marketing Funding Input Contract
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>


 Classic funding method that receives ETH and mints tokens directly
    - has hard cap.
    - minted supply affects final token supply.
    - does not use vaults, mints directly to sender address.
    - accepts over cap payment and returns what's left back to sender.
  Funds used exclusively for Marketing

*/

pragma solidity ^0.4.17;
import "./abis/ABITokenManager.sol";

contract ExtraFundingInputMarketing {

    ABITokenManager public TokenManagerEntity;
    address public outputWalletAddress;
    uint256 public hardCap;
    uint256 public tokensPerEth;

    uint256 public start_time;
    uint256 public end_time;

    uint256 public AmountRaised = 0;

    address public deployer;
    bool public settings_added = false;

    function ExtraFundingInputMarketing() public {
        deployer = msg.sender;
    }

    function addSettings(
        address _tokenManager,
        address _outputWalletAddress,
        uint256 _cap,
        uint256 _price,
        uint256 _start_time,
        uint256 _endtime
    )
        public
    {
        require(msg.sender == deployer);
        require(settings_added == false);

        TokenManagerEntity = ABITokenManager(_tokenManager);
        outputWalletAddress = _outputWalletAddress;
        hardCap = _cap;
        tokensPerEth = _price;
        start_time = _start_time;
        end_time = _endtime;
        settings_added = true;
    }

    event EventInputPaymentReceived(address sender, uint amount);

    function () public payable {
        buy();
    }

    function buy() public payable returns(bool) {
        if(msg.value > 0) {
            if( canAcceptPayment() ) {

                uint256 contributed_value = msg.value;
                uint256 amountOverCap = getValueOverCurrentCap(contributed_value);
                if ( amountOverCap > 0 ) {
                    // calculate how much we can accept

                    // update contributed value
                    contributed_value -= amountOverCap;
                }

                // update raised value
                AmountRaised+= contributed_value;

                // allocate tokens to contributor based on value
                uint256 tokenAmount = getTokensForValue( contributed_value );
                TokenManagerEntity.mintForMarketingPool( msg.sender, tokenAmount);

                // transfer contributed value to platform wallet
                if( !outputWalletAddress.send(contributed_value) ) {
                    revert();
                }

                if(amountOverCap > 0) {
                    // last step, if we received more than we can accept, send remaining back
                    // amountOverCap sent back
                    if( msg.sender.send(this.balance) ) {
                        return true;
                    }
                    else {
                        revert();
                    }
                } else {
                    return true;
                }
            } else {
                revert();
            }
        } else {
            revert();
        }
    }

    function canAcceptPayment() public view returns (bool) {
        if( (getTimestamp() >= start_time && getTimestamp() <= end_time) && (AmountRaised < hardCap) ) {
            return true;
        }
        return false;
    }

    function getTokensForValue( uint256 _value) public view returns (uint256) {
        return _value * tokensPerEth;
    }

    function getValueOverCurrentCap(uint256 _amount) public view returns (uint256) {
        uint256 remaining = hardCap - AmountRaised;
        if( _amount > remaining ) {
            return _amount - remaining;
        }
        return 0;
    }

    function getTimestamp() view public returns (uint256) {
        return now;
    }

}
