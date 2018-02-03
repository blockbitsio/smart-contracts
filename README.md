BlockBits.io Smart Contracts
===================

# Branches
master - Tokens sold at Fixed price, with variable supply, generates bounty / owner supplies

market-decided-token-sale - Fixed Token supply, tokens sold based on market participation

# SETUP INSTRUCTIONS
Clone repository

```git clone https://github.com/blockbitsio/smart-contracts blockbits```

Change directory into the blockbits folder

```cd blockbits```

Install dependencies
```npm run install```

Install solc-binary on your system

Follow: [https://solidity.readthedocs.io/en/latest/installing-solidity.html#binary-packages](https://solidity.readthedocs.io/en/latest/installing-solidity.html#binary-packages)


# Available Commands
Once you have everything installed

## Running tests
```npm run test```

## Running coverage tests
```npm run coverage```

## Running tests and coverage tests and logging output
```npm run html```

```npm run testToHtml```

```npm run coverageToHtml```

# Structure

----------------------------
|Path | Description|
|:--- | :--- |
| build/ | Built Contracts | 
| contracts/ | Smart Contract Sources | 
| migrations/ | Truffle Migrations and Deployment Scripts| 
| output/ | HTML Test and Coverage Reports output directory | 
| scripts/ | TestRPC, SolCoverage Scripts | 
| test/ | Truffle Test Suite | 
| test/app/ | Test Builder Application Helper | 
| test/helpers/ | General Test Helpers | 
| test/mocks/ | Smart Contract - Test Mocks | 
| test/tests/ | Truffle Tests | 
----------------------------

# Technical Documentation
View Live Documentation at [http://docs.blockbits.io](http://docs.blockbits.io) or Sources at [https://github.com/blockbitsio/documentation](https://github.com/blockbitsio/documentation)


# Live Contracts:
Used by the BlockBits.io funding.

## Live Entities:

----------------------------
|Contract Name | Address (Ethereum - MainNet)|
|:--- | :--- |
| GatewayInterface | [0x3dfa93d0d80c9985c9c78ce3620bd0803767a95c](https://etherscan.io/address/0x3dfa93d0d80c9985c9c78ce3620bd0803767a95c)| 
| ApplicationEntity | [0x29632c10d76bd1aed6b1524bf5bde4c992610670](https://etherscan.io/address/0x29632c10d76bd1aed6b1524bf5bde4c992610670)| 
| - ListingContract | [0x5f03b7561e62efdab8b2fb740d83630d4d2710d7](https://etherscan.io/address/0x5f03b7561e62efdab8b2fb740d83630d4d2710d7) | 
| - NewsContract | [0x7d88463cc6d0ba403d302204236898414db3251a](https://etherscan.io/address/0x7d88463cc6d0ba403d302204236898414db3251a) | 
| - TokenManager | [0x584af734a101538cad9b9522d1b9c87f1c08f9c4](https://etherscan.io/address/0x584af734a101538cad9b9522d1b9c87f1c08f9c4) | 
| - Proposals | [0x5b2db92a43aa86fff2d9a3696a7ee264d03fc907](https://etherscan.io/address/0x5b2db92a43aa86fff2d9a3696a7ee264d03fc907) | 
| - FundingManager | [0xb4007597da3402a1e2b69c8e1c6dd753d01a8035](https://etherscan.io/address/0xb4007597da3402a1e2b69c8e1c6dd753d01a8035) | 
| - Funding | [0x58534c480ef96b6478940f9bbf6748da8f2ec935](https://etherscan.io/address/0x58534c480ef96b6478940f9bbf6748da8f2ec935) | 
| - Milestones | [0xb4e8d821b5b43fca08f5986d9b52a8dc00565cc5](https://etherscan.io/address/0xb4e8d821b5b43fca08f5986d9b52a8dc00565cc5) | 
| - Meetings | [0xb435c8dd6edd82918606f0b2d73970683806b004](https://etherscan.io/address/0xb435c8dd6edd82918606f0b2d73970683806b004) | 
| - BountyManager | [0x766d1f049ba649f9a89ae417ba555599a6546b5a](https://etherscan.io/address/0x766d1f049ba649f9a89ae417ba555599a6546b5a) | 
----------------------------

## Funding Methods

----------------------------
|Contract Name | Address (Ethereum - MainNet)|
|:--- | :--- |
|InputDirect | [0xb05faba79ac993dc1ff7e3a0a764c3d0478cdc1f](https://etherscan.io/address/0xb05faba79ac993dc1ff7e3a0a764c3d0478cdc1f)|
|InputMilestone | [0x91ca47b9ec3187c77f324281a1851f4b991103f1](https://etherscan.io/address/0x91ca47b9ec3187c77f324281a1851f4b991103f1)|
|InputMarketing | [0xdfe06d5a4534fbe955eebe8a4908ef596763c2a4](https://etherscan.io/address/0xdfe06d5a4534fbe955eebe8a4908ef596763c2a4)|
----------------------------


## Extra Objects

----------------------------
|Contract Name | Address (Ethereum - MainNet)|
|:--- | :--- |
| TokenSCADA | [0x73600ae44810343067e6fac315d90d30b3e0378a](https://etherscan.io/address/0x73600ae44810343067e6fac315d90d30b3e0378a)|
| ERC20 - Token | [0xc00b9bdb6b2ae341b4321be4b2a752ae6a5db18c](https://etherscan.io/address/0xc00b9bdb6b2ae341b4321be4b2a752ae6a5db18c)|
----------------------------


# License
MIT License