import { Connection, PublicKey } from "@solana/web3.js";

function readPublicKey(buf: Buffer, offset: number): PublicKey {
  return new PublicKey(buf.subarray(offset, offset + 32));
}

function readU64(buf: Buffer, offset: number): bigint {
  return buf.readBigUInt64LE(offset);
}

function readI64(buf: Buffer, offset: number): bigint {
  return buf.readBigInt64LE(offset);
}

function readU128(buf: Buffer, offset: number): bigint {
  const lo = buf.readBigUInt64LE(offset);
  const hi = buf.readBigUInt64LE(offset + 8);
  return (hi << 64n) | lo;
}

function readI32(buf: Buffer, offset: number): number {
  return buf.readInt32LE(offset);
}

interface FeeInfo {
  feeXPerTokenComplete: bigint;
  feeYPerTokenComplete: bigint;
  feeXPending: bigint;
  feeYPending: bigint;
}

interface UserRewardInfo {
  rewardPerTokenCompletes: [bigint, bigint];
  rewardPendings: [bigint, bigint];
}

interface PositionV2 {
  discriminator: Buffer;
  lbPair: PublicKey;
  owner: PublicKey;
  liquidityShares: bigint[];
  rewardInfos: UserRewardInfo[];
  feeInfos: FeeInfo[];
  lowerBinId: number;
  upperBinId: number;
  lastUpdatedAt: bigint;
  totalClaimedFeeXAmount: bigint;
  totalClaimedFeeYAmount: bigint;
  totalClaimedRewards: [bigint, bigint];
  operator: PublicKey;
  lockReleasePoint: bigint;
  feeOwner: PublicKey;
}

const USER_REWARD_INFO_SIZE = 48;
const FEE_INFO_SIZE = 48;
const BIN_COUNT = 70;

function decodePosition(data: Buffer): PositionV2 {
  let o = 0;

  // discriminator (8 bytes)
  const discriminator = data.subarray(o, o + 8);
  o += 8;

  const lbPair = readPublicKey(data, o);
  o += 32;

  const owner = readPublicKey(data, o);
  o += 32;

  const liquidityShares: bigint[] = [];
  for (let i = 0; i < BIN_COUNT; i++) {
    liquidityShares.push(readU128(data, o));
    o += 16;
  }

  const rewardInfos: UserRewardInfo[] = [];
  for (let i = 0; i < BIN_COUNT; i++) {
    const rewardPerTokenCompletes: [bigint, bigint] = [
      readU128(data, o),
      readU128(data, o + 16),
    ];
    const rewardPendings: [bigint, bigint] = [
      readU64(data, o + 32),
      readU64(data, o + 40),
    ];
    rewardInfos.push({ rewardPerTokenCompletes, rewardPendings });
    o += USER_REWARD_INFO_SIZE;
  }

  const feeInfos: FeeInfo[] = [];
  for (let i = 0; i < BIN_COUNT; i++) {
    feeInfos.push({
      feeXPerTokenComplete: readU128(data, o),
      feeYPerTokenComplete: readU128(data, o + 16),
      feeXPending: readU64(data, o + 32),
      feeYPending: readU64(data, o + 40),
    });
    o += FEE_INFO_SIZE;
  }

  const lowerBinId = readI32(data, o);
  o += 4;

  const upperBinId = readI32(data, o);
  o += 4;

  const lastUpdatedAt = readI64(data, o);
  o += 8;

  const totalClaimedFeeXAmount = readU64(data, o);
  o += 8;

  const totalClaimedFeeYAmount = readU64(data, o);
  o += 8;

  const totalClaimedRewards: [bigint, bigint] = [
    readU64(data, o),
    readU64(data, o + 8),
  ];
  o += 16;

  const operator = readPublicKey(data, o);
  o += 32;

  const lockReleasePoint = readU64(data, o);
  o += 8;

  o += 1;

  const feeOwner = readPublicKey(data, o);

  return {
    discriminator,
    lbPair,
    owner,
    liquidityShares,
    rewardInfos,
    feeInfos,
    lowerBinId,
    upperBinId,
    lastUpdatedAt,
    totalClaimedFeeXAmount,
    totalClaimedFeeYAmount,
    totalClaimedRewards,
    operator,
    lockReleasePoint,
    feeOwner,
  };
}

const POSITION = new PublicKey("3BznENHP5KkRikLZqCLGLTaVGcDBsWDTLjSCbHZD2qTA");
const connection = new Connection("http://localhost:8899", "confirmed");

async function main() {
  const positionInfo = await connection.getAccountInfo(POSITION);

  if (!positionInfo) {
    throw new Error(`Position account not found: ${POSITION.toBase58()}`);
  }

  const position = decodePosition(positionInfo.data as Buffer);

  console.log({
    lbPair: position.lbPair.toBase58(),
    totalClaimedFeeXAmount: position.totalClaimedFeeXAmount.toString(),
    operator: position.operator.toBase58(),
    totalClaimedFeeYAmount: position.totalClaimedFeeYAmount.toString(),
    lowerBinId: position.lowerBinId,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
