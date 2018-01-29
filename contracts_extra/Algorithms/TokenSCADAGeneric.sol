/*

 * @name        Token Stake Calculation And Distribution Algorithm Generic Interface
 * @package     BlockBitsIO
 * @author      Micky Socaci <micky@nowlive.ro>

    this interface allows the funding asset to enforce the requirement of hard and soft caps on funding phases.
    as some token SCADA's require them, and some require them to not be present.
*/

pragma solidity 0.4.17;

import "./../Entity/Funding.sol";
import "./../Entity/Token.sol";
import "./../Entity/FundingVault.sol";

contract TokenSCADAGeneric {

    uint256 tokenSupply;
    Funding FundingEntity;
    Token TokenEntity;
    address FundingManagerAddress;

    bool public SCADA_requires_hard_cap = true;

    function TokenSCADAGeneric(address _tokenContract, address _fundingContract ) public {
        TokenEntity = Token(_tokenContract);
        FundingEntity = Funding(_fundingContract);

        // these never change once initialized!
        tokenSupply = TokenEntity.totalSupply();

        // save FundingManagerAddress for modifier usage
        FundingManagerAddress = FundingEntity.getApplicationAssetAddressByName('FundingManager');
    }

    function requiresHardCap() public view returns (bool) {
        return SCADA_requires_hard_cap;
    }


    function getBoughtTokens( address _vaultAddress, bool _direct ) public view returns (uint256) {
        // second stage
        uint256 myIcoTokens = getMyTokensInSecondStage( _vaultAddress, _direct );
        // first stage
        uint256 myPRETokens = getMyTokensInFirstStage( _vaultAddress, _direct );

        if(UnsoldTokenAmountCacheValue == 0) {
            return myPRETokens + myIcoTokens;
        } else {
            // also distribute unsold token share based on how many this vault bought
            uint256 myUnsoldTokenShare = getUnsoldTokenFraction(
                UnsoldTokenAmountCacheValue, (myPRETokens + myIcoTokens)
            );
            return myPRETokens + myIcoTokens + myUnsoldTokenShare;
        }
    }

    function getMyTokensInFirstStage(address _vaultAddress, bool _direct) public view returns(uint256) {
        FundingVault vault = FundingVault(_vaultAddress);
        uint8 PREpercentInStage = FundingEntity.getStageTokenSharePercentage(1);
        uint256 PREraisedAmount = FundingEntity.getStageAmountRaised(1);
        // make sure we're not dividing by 0
        if(PREraisedAmount > 0) {
            uint256 amount = vault.stageAmounts(1);
            if(_direct) {
                amount = vault.stageAmountsDirect(1);
            }

            return getTokenFraction( PREpercentInStage, PREraisedAmount, amount );
        } else {
            // pre ico raised 0 eth, so we distribute tokens based on stake in ICO
            return getPRETokensBasedOnStakeInICO(_vaultAddress);
        }
    }

    function getMyTokensInSecondStage(address _vaultAddress, bool _direct) public view returns(uint256) {
        FundingVault vault = FundingVault(_vaultAddress);
        uint256 amount = vault.stageAmounts(2);
        if(_direct) {
            amount = vault.stageAmountsDirect(2);
        }
        if(UnsoldTokenAmountCacheValue == 0) {
            // all tokens got sold, no need to redistribute, we use fraction here
            uint8 percentInStage = FundingEntity.getStageTokenSharePercentage(2);
            uint256 raisedAmount = FundingEntity.getStageAmountRaised(2);
            if(raisedAmount > 0) {
                return getTokenFraction( percentInStage, raisedAmount, amount );
            } else {
                // ico raised 0 eth, so we distribute tokens based on stake in PRE
                return getICOTokensBasedOnStakeInPRE(_vaultAddress);
            }
        }
        else {
            // ico has unsold tokens, we use parity
            return amount * stageTwoParityCacheValue;
        }
    }

    function getPRETokensBasedOnStakeInICO(address _vaultAddress) view internal returns(uint256) {
        uint256 myIcoTokens = getMyTokensInSecondStage( _vaultAddress, false );
        uint8 PREpercentInStage = FundingEntity.getStageTokenSharePercentage(1);
        uint8 ICOpercentInStage = FundingEntity.getStageTokenSharePercentage(2);
        uint256 ICOtokensInStage = tokenSupply * ICOpercentInStage / 100;
        uint256 precision = 18;
        uint256 preIcoUnsoldSupply = tokenSupply * PREpercentInStage / 100;
        uint256 myFraction = getFraction(myIcoTokens, ICOtokensInStage, precision);
        return (preIcoUnsoldSupply * myFraction) / ( 10 ** precision );
    }



    function getICOTokensBasedOnStakeInPRE(address _vaultAddress) view internal returns(uint256) {
        uint8 PREpercentInStage = FundingEntity.getStageTokenSharePercentage(1);
        uint8 ICOpercentInStage = FundingEntity.getStageTokenSharePercentage(2);
        uint256 myPreTokens = getMyTokensInFirstStage( _vaultAddress, false );
        uint256 PREtokensInStage = tokenSupply * PREpercentInStage / 100;
        uint256 precision = 18;
        uint256 IcoUnsoldSupply = tokenSupply * ICOpercentInStage / 100;
        uint256 myFraction = getFraction(myPreTokens, PREtokensInStage, precision);
        return (IcoUnsoldSupply * myFraction) / ( 10 ** precision );
    }

    function getStageTwoParity() public view returns(uint256) {
        uint256 parityPRE = TokenParityCacheValue[1];
        uint256 parityICO = TokenParityCacheValue[2];
        if(parityPRE > 0 && parityPRE < parityICO) {
            return parityPRE;
        } else {
            return parityICO;
        }
    }

    function getTokenFraction(uint8 _percentInStage, uint256 _raisedAmount, uint256 _my_ether_amount )
        public view returns(uint256)
    {
        // make sure we're not dividing by 0
        if(_raisedAmount > 0) {
            return ((tokenSupply * _percentInStage / 100) * _my_ether_amount) / _raisedAmount;
        } else {
            return 0;
        }
    }

    function getUnsoldTokenFraction(uint256 _unsold_supply, uint256 my_amount ) public view returns(uint256) {
        uint256 precision = 18;
        // make sure we're not dividing by 0
        if(my_amount > 0) {
            uint256 fraction = getFraction(my_amount, getSoldTokenAmount(), precision);
            return (_unsold_supply * fraction) / ( 10 ** precision );
        } else {
            return 0;
        }
    }

    function getFraction(uint256 numerator, uint256 denominator, uint256 precision) public pure returns(uint256) {
        // caution, check safe-to-multiply here
        uint _numerator  = numerator * 10 ** (precision+1);
        // with rounding of last digit
        uint _quotient =  ((_numerator / denominator) + 5) / 10;
        return _quotient;
    }

    function getSoldTokenAmount() public view returns(uint256) {
        uint8 TokenSellPercentage = FundingEntity.TokenSellPercentage();
        uint256 TokensForSale = tokenSupply * TokenSellPercentage / 100;
        return TokensForSale - UnsoldTokenAmountCacheValue;
    }

    function getUnsoldTokenAmount() public view returns(uint256) {
        uint256 parity = stageTwoParityCacheValue;
        uint256 parityPRE = TokenParityCacheValue[1];
        if(parity == parityPRE) {
            // case 1, we receive a lot in pre, we need to sell ico tokens at partiy + added price,
            // and redistribute the ones left
            uint8 percentInStage = FundingEntity.getStageTokenSharePercentage(2);
            uint256 raisedAmount = FundingEntity.getStageAmountRaised(2);
            uint256 tokensInStage = tokenSupply * percentInStage / 100;
            uint256 tokensSold = raisedAmount * parity;
            return tokensInStage - tokensSold ;
        } else {
            // case 2, pre ico sold some tokens but did not reach 10% parity fraction of total,
            // this means pre ico 1 distribution is OK and has a pretty large discount
            // also that ICO sold all remaining tokens allocated to it... this means we should have 0 unsold tokens
            // parity = parityICO;
            return 0;
        }
    }

    function getTokenParity(uint8 stageId) public view returns (uint256) {
        uint8 percentInStage = FundingEntity.getStageTokenSharePercentage(stageId);
        uint256 raisedAmount = FundingEntity.getStageAmountRaised(stageId);
        // make sure we're not dividing by 0
        if(raisedAmount > 0) {
            uint256 tokensInStage = tokenSupply * percentInStage / 100;
            uint256 parity = tokensInStage / raisedAmount;
            if(stageId == 1) {
                uint8 priceAdd = FundingEntity.getStagePriceAdd(2);
                if(priceAdd > 0) {
                    parity = parity - ( parity * priceAdd / 100 );
                }
            }
            return parity;
        } else {
            return 0;
        }
    }

    function initCacheForVariables() public onlyFundingManager returns(bool) {

        // remove bounty supply from total for easier calculations
        uint256 bountyPercent = FundingEntity.getAppBylawUint256("token_bounty_percentage");
        uint256 bountyValue = tokenSupply * bountyPercent / 100;
        tokenSupply = tokenSupply - bountyValue;

        setTokenParityInCache(1);
        setTokenParityInCache(2);
        setStageTwoParityInCache();
        setUnsoldTokenAmountInCache();
        return true;
    }
    /*
        Caching reused variables in order to decrease gas usage in vault processing.
        resulting in a drop of about 70%
    */
    mapping ( uint8 => bool ) TokenParityCacheState;
    mapping ( uint8 => uint256 ) TokenParityCacheValue;
    function setTokenParityInCache(uint8 stageId) internal {
        if(TokenParityCacheState[stageId] == false) {
            TokenParityCacheValue[stageId] = getTokenParity(stageId);
            TokenParityCacheState[stageId] = true;
        }
    }

    bool public stageTwoParityCachedState = false;
    uint256 public stageTwoParityCacheValue;
    function setStageTwoParityInCache() internal {
        if(stageTwoParityCachedState == false) {
            stageTwoParityCacheValue = getStageTwoParity();
            stageTwoParityCachedState = true;
        }
    }

    bool public UnsoldTokenAmountCachedState = false;
    uint256 public UnsoldTokenAmountCacheValue;
    function setUnsoldTokenAmountInCache() internal {
        if(UnsoldTokenAmountCachedState == false) {
            UnsoldTokenAmountCacheValue = getUnsoldTokenAmount();
            UnsoldTokenAmountCachedState = true;
        }
    }

    modifier onlyFundingManager() {
        require(msg.sender == address(FundingManagerAddress));
        _;
    }

}