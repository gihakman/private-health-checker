import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import { expect } from "chai";

describe("PrivateHealthChecker", function () {
  async function deployFixture() {
    await hre.run("task:cofhe-mocks:deploy");
    const [deployer, user] = await hre.ethers.getSigners();

    const Factory = await hre.ethers.getContractFactory("PrivateHealthChecker");
    const checker = await Factory.connect(deployer).deploy();

    const client = await hre.cofhe.createClientWithBatteries(user);

    return { checker, user, client };
  }

  async function checkHealth(
    fixture: Awaited<ReturnType<typeof deployFixture>>,
    collateral: bigint,
    debt: bigint
  ): Promise<boolean> {
    const { checker, user, client } = fixture;

    const encrypted = await client
      .encryptInputs([Encryptable.uint64(collateral), Encryptable.uint64(debt)])
      .execute();

    await checker.connect(user).checkHealth(encrypted[0], encrypted[1]);

    const ctHash = await checker.latestResult(user.address);
    const result = await client.decryptForView(ctHash, FheTypes.Bool).execute();
    return Boolean(result);
  }

  describe("Safe positions (health >= 150%)", function () {
    it("200/100 = 200% → safe", async function () {
      const fixture = await loadFixture(deployFixture);
      expect(await checkHealth(fixture, 200n, 100n)).to.equal(true);
    });

    it("150/100 = exactly 150% (gte) → safe", async function () {
      const fixture = await loadFixture(deployFixture);
      expect(await checkHealth(fixture, 150n, 100n)).to.equal(true);
    });

    it("3/2 = 150% → safe", async function () {
      const fixture = await loadFixture(deployFixture);
      expect(await checkHealth(fixture, 3n, 2n)).to.equal(true);
    });

    it("1000000000000/10000000000 = 10000% → safe", async function () {
      const fixture = await loadFixture(deployFixture);
      expect(await checkHealth(fixture, 1000000000000n, 10000000000n)).to.equal(true);
    });
  });

  describe("Unsafe positions (health < 150%)", function () {
    it("140/100 = 140% → unsafe", async function () {
      const fixture = await loadFixture(deployFixture);
      expect(await checkHealth(fixture, 140n, 100n)).to.equal(false);
    });

    it("149/100 = 149% → unsafe", async function () {
      const fixture = await loadFixture(deployFixture);
      expect(await checkHealth(fixture, 149n, 100n)).to.equal(false);
    });

    it("100/100 = 100% → unsafe", async function () {
      const fixture = await loadFixture(deployFixture);
      expect(await checkHealth(fixture, 100n, 100n)).to.equal(false);
    });

    it("0/100 = 0% → unsafe", async function () {
      const fixture = await loadFixture(deployFixture);
      expect(await checkHealth(fixture, 0n, 100n)).to.equal(false);
    });
  });

  describe("Zero debt (handled via FHE.select, no revert)", function () {
    it("1000/0 → safe (no debt = no liquidation)", async function () {
      const fixture = await loadFixture(deployFixture);
      expect(await checkHealth(fixture, 1000n, 0n)).to.equal(true);
    });

    it("0/0 → safe (no debt = no liquidation)", async function () {
      const fixture = await loadFixture(deployFixture);
      expect(await checkHealth(fixture, 0n, 0n)).to.equal(true);
    });
  });
});
