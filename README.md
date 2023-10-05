
### Price Bulletin Contract

!THIS NEEDS TO BE REDEPLOYED   

|Contract Name | Deployed Address                         | Chains                                                                      |Test Chains            |
|--------------|------------------------------------------|-----------------------------------------------------------------------------|-----------------------|
|PriceBulletin |0x94C82325a2B26f27AEb08B936331c8485a988634|Eth, Arbitrum, Optimism, Gnosis, Polygon, PolygonZkevm, Base, Linea          |Goerli, Mumbai, Sepolia|

### Diamond and Facets

Diamond contract address: 0x8f78dc290e1701EC664909410661DC17E9c7b62b   
   
   
|Contract Name      | Deployed Address                         | Chain  |
|-------------------|------------------------------------------|--------|
|DiamondCutFacet    |0x0c1d58c012Bb6c34Ca32510f4E458b7198566f17| Gnosis |
|DiamondLoupeFacet  |0xEB1fb5d8247999eaBA01E42b03E9458ddb77aa78| Gnosis |
|OwnershipFacet     |0x7B85cD42B57DDDD03a4928C15c2d4FBDA909dB3a| Gnosis |
|RedstoneFacet      |0xbfaF4c60dc1dAE72e93acffE17410d04E713c783| Gnosis |
|PythFacet          |0xB2c111eF9eFc9F330099370eb764Dbce40698635| Gnosis |
|ChainlinkFacet     |0xC8Fe8E631C7BEDDFdF1DfAe11DC82d23018FDC14| Gnosis |
|CuicaFacet         |0x3cDe0Db87ca14d82E91e030A1f5B502D27746dA4| Gnosis |


### Validate an upgrade to Price Bulletin Contract
This guide helps check if an intended upgrade to the PriceBulletin.sol contract will break storage. It uses Openzeppelin upgrades-core tool. Refer to [documentation](https://docs.openzeppelin.com/upgrades-plugins/1.x/api-core#validate-command).   

1. Create the new intended version of the PriceBulletin contract with a versioned name. For example: `PriceBulletinV2.sol`   
2. Add the Natspec annotation reference to the contract. See example below:   

```solidity
@custom:oz-upgrades-from PriceBulletin
contract PriceBulletinV2 is IPriceBulletin, UUPSUpgradeable, OwnableUpgradeable, BulletinSigning {
}
```
3. Format contracts and compile both with Hardhat and Foundry.

```
forge fmt && npx hardhat compile && forge compile
```

4. Last run command (replace <PriceBulletinV2> with the name of the versioned contract you created):

```
npx @openzeppelin/upgrades-core validate artifacts/build-info --contract PriceBulletinV2
```

5. Once you have confirmed the changes are upgrade safe, replace the original PriceBulletin.sol contract with your changes and delete the versioned named contract.
