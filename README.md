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
| GatewayInterface | 0xb53c1cf91c8e973e2a662b2f34213c1f9f434330| 
| ApplicationEntity | 0x0395899092b1c0d99b7c7bc10b463ab1a306b698| 
| - ListingContract | 0xc92226702b530207dd0fd6ea92d79e8f86af5b88| 
| - NewsContract | 0xb15e2264a2ca33fedc93db932b7926718771a28d| 
| - TokenManager | 0x2be8674f4ddea5db4feb7925c1af5360e28344fd| 
| - Proposals | 0xb56c079685b8228cbe953e577817713036a63996| 
| - FundingManager | 0x6a86a4815f74cb8ab54a23b5d8d3104c8bdc8de2| 
| - Funding | 0xd7a7432687ae65af028438733a23ad4ddfb9c675| 
| - Milestones | 0x98aa85d44e959eaaac6e21a56be8cd38fd6ec9c2| 
| - Meetings | 0xf76e30c00dbe64bac46bd84536564b47f287f0ef| 
| - BountyManager | 0x9b1844acc6386407ba6c1597ff324240ef6b6562| 
----------------------------

## Funding Methods

----------------------------
|Contract Name | Address (Ethereum - MainNet)|
|:--- | :--- |
|InputDirect | 0x706c110ecdd7259b6a1a2c0702b610581189f4b3|
|InputMilestone | 0xeb548240fcb9b113f1cf2b9ef1c7ca4c8afe7804|
|InputMarketing | 0x35038318a0dd465c49851f7744c052fb5a239d50|
----------------------------


## Extra Objects

----------------------------
|Contract Name | Address (Ethereum - MainNet)|
|:--- | :--- |
| TokenSCADA | 0xdb9f5c7558306d3f8e9103819ffa0cfe3f9e31be|
| ERC20 - Token | 0x28dbf31a80b741ceb7d880eb7c37dfee6a5df2e1|
----------------------------


# License
MIT License