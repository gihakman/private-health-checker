import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { saveDeployment } from './utils'

task('deploy-health-checker', 'Deploy PrivateHealthChecker').setAction(async (_, hre: HardhatRuntimeEnvironment) => {
	const { ethers, network } = hre

	const [deployer] = await ethers.getSigners()
	console.log(`Deploying PrivateHealthChecker on ${network.name} with ${deployer.address}`)

	const Factory = await ethers.getContractFactory('PrivateHealthChecker')
	const checker = await Factory.deploy()
	await checker.waitForDeployment()

	const address = await checker.getAddress()
	console.log(`PrivateHealthChecker deployed: ${address}`)

	saveDeployment(network.name, 'PrivateHealthChecker', address)
	return address
})
