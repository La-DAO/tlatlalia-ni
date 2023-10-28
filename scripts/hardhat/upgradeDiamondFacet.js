const { ethers } = require("hardhat")
const { FacetCutAction } = require('./libraries/diamond.js')
const {
    getLocalhostJsonRPCProvider,
    getEnvWSigner,
    getChainProvider,
    CUICA_DATA_MAINNET
} = require('../utilsCuica.js')

const DEBUG = false

/**
 * Simple method to get ONLY the selectors from a `ethers.Contract`
 * 
 * @param {*} contract 
 */
function getSelectors(contract) {
    const signatures = Object.keys(contract.interface.functions)
    const selectors = signatures.reduce((acc, val) => {
        if (val !== 'init(bytes)') {
            acc.push(contract.interface.getSighash(val))
        }
        return acc
    }, [])
    return selectors
}

/**
 * Compares the changed selectors and splits into the actions that must
 * be performed at the `diamonCut` for: add, replace, remove
 * 
 * @param {string[]} oldFacet selectors
 * @param {string[]} newFacet selectors
 * @returns 
 */
function compareSelectors(oldFacet, newFacet) {
    const replace = oldFacet.filter(value => newFacet.includes(value));
    const remove = oldFacet.filter(value => !newFacet.includes(value));
    const add = newFacet.filter(value => !oldFacet.includes(value));

    return [add, replace, remove];
}

async function upgradeDiamondFacet(facetName, oldFacetAddress, chainName = 'localhost') {
    if (!facetName || !oldFacetAddress) throw "Undefined faceName and/or oldFacetAddress"

    let signer = chainName == 'localhost' ?
        getEnvWSigner(getLocalhostJsonRPCProvider()) :
        getEnvWSigner(getChainProvider(chainName))

    const diamondLoupeFacet = await ethers.getContractAt(
        'DiamondLoupeFacet',
        CUICA_DATA_MAINNET.gnosis.diamond,
        signer
    )

    const oldFacetSelectors = await diamondLoupeFacet.facetFunctionSelectors(oldFacetAddress)

    console.log("\n\n 📡 Deploying...\n")
    const Facet = await ethers.getContractFactory(facetName, signer)
    const newFacet = await Facet.deploy()
    await newFacet.deployed()
    console.log(`Upraded Facet ${facetName} : deployed at`, newFacet.address)

    const newFacetSelectors = getSelectors(newFacet)
    const [adds, replaces, removes] = compareSelectors(oldFacetSelectors, newFacetSelectors);

    const diamondCutFacet = await ethers.getContractAt(
        'DiamondCutFacet',
        CUICA_DATA_MAINNET.gnosis.diamond,
        signer
    )

    console.log("\n\n 📡 Upgrading Diamond Facets...\n")
    // Handle Adds
    if (adds.length > 0) {
        console.log("Adding new selectors:\n", adds)
        const facetCut = [{
            facetAddress: newFacet.address,
            action: FacetCutAction.Add,
            functionSelectors: adds
        }]
        const tx = await diamondCutFacet.diamondCut(
            facetCut,
            ethers.constants.AddressZero,
            '0x'
        )
        await tx.wait()
        console.log("Adding new selectors complete!")
    }

    // Handle Replaces
    if (replaces.length > 0) {
        console.log("Replacing old selectors:\n", replaces)
        const facetCut = [{
            facetAddress: newFacet.address,
            action: FacetCutAction.Replace,
            functionSelectors: replaces
        }]
        const tx = await diamondCutFacet.diamondCut(
            facetCut,
            ethers.constants.AddressZero,
            '0x'
        )
        await tx.wait()
        console.log("Replacing old selectors complete!")
    }

    // Handle Removes
    if (removes.length > 0) {
        console.log("Removing unused old selectors:", removes)
        const facetCut = [{
            facetAddress: newFacet.address,
            action: FacetCutAction.Remove,
            functionSelectors: removes
        }]
        const tx = await diamondCutFacet.diamondCut(
            facetCut,
            ethers.constants.AddressZero,
            '0x'
        )
        await tx.wait()
        console.log("Removing unused old selectors complete!")
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
    const args = process.argv.slice(2); // Extract arguments, excluding the first two elements

    if (args.length !== 3) {
        console.error("Usage: node replaceDiamondFacet.js <facetName> <oldFacetAddr> <chainName>");
        process.exit(1);
    }

    const faceName = args[0];
    const oldFacetAddr = args[1];
    const chainName = args[2];

    upgradeDiamondFacet(faceName, oldFacetAddr, chainName)
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error)
            process.exit(1)
        })
}

exports.upgradeDiamondFacet = upgradeDiamondFacet