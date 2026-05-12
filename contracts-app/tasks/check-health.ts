import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Encryptable, FheTypes } from '@cofhe/sdk'
import { getDeployment, createCofheClient } from './utils'

task('check-health', 'Check collateral health privately')
	.addParam('collateral', 'Collateral amount (USD integer)')
	.addParam('debt', 'Debt amount (USD integer)')
	.setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
		const { ethers, network } = hre

		const address = getDeployment(network.name, 'PrivateHealthChecker')
		if (!address) {
			console.error(`No PrivateHealthChecker deployment on ${network.name}. Run deploy-health-checker first.`)
			return
		}

		const [signer] = await ethers.getSigners()
		console.log(`Account: ${signer.address}`)
		console.log(`Contract: ${address} on ${network.name}`)

		if (network.name === 'hardhat') {
			await hre.run('task:cofhe-mocks:deploy')
		}

		const client = await createCofheClient(hre, signer)

		const Factory = await ethers.getContractFactory('PrivateHealthChecker')
		const checker = Factory.attach(address)

		const collateral = BigInt(taskArgs.collateral)
		const debt = BigInt(taskArgs.debt)

		console.log(`Encrypting inputs...`)
		const encrypted = await client
			.encryptInputs([Encryptable.uint64(collateral), Encryptable.uint64(debt)])
			.execute()

		console.log(`Submitting checkHealth tx...`)
		const tx = await checker.connect(signer).checkHealth(encrypted[0], encrypted[1])
		const receipt = await tx.wait()
		console.log(`Tx confirmed: ${tx.hash} (block ${receipt?.blockNumber})`)

		console.log(`Decrypting result...`)
		const ctHash = await checker.latestResult(signer.address)

		let result: any
		for (let attempt = 1; attempt <= 3; attempt++) {
			try {
				result = await client.decryptForView(ctHash, FheTypes.Bool).execute()
				break
			} catch (e: any) {
				if (attempt === 3) throw e
				console.log(`Decrypt attempt ${attempt} failed (Threshold Network may be busy), retrying in 5s...`)
				await new Promise(r => setTimeout(r, 5000))
			}
		}

		if (result) {
			console.log(`\n✓ Safe — no liquidation risk`)
		} else {
			console.log(`\n✗ At Risk — add collateral or repay debt`)
		}
	})
