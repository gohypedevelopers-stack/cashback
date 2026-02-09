const crypto = require('crypto');
const prisma = require('../config/prismaClient');
const { safeLogActivity } = require('../utils/activityLogger');

const CLAIM_TTL_MINUTES = Number.parseInt(process.env.CLAIM_TOKEN_TTL_MINUTES || '10', 10);
const SAFE_TTL_MINUTES = Number.isFinite(CLAIM_TTL_MINUTES) && CLAIM_TTL_MINUTES > 0 ? CLAIM_TTL_MINUTES : 10;

const toPositiveAmount = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Number(numeric.toFixed(2));
};

const buildExpiry = () => new Date(Date.now() + SAFE_TTL_MINUTES * 60 * 1000);

const generateToken = () => crypto.randomBytes(16).toString('hex');

const getClaimStatus = (claim, now = new Date()) => {
  if (!claim) return 'invalid';
  if (claim.claimedAt) return 'claimed';
  if (now > claim.expiresAt) return 'expired';
  return 'unclaimed';
};

const ensureWallet = async (tx, userId) => {
  let wallet = await tx.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    wallet = await tx.wallet.create({
      data: { userId, balance: 0.00, currency: 'INR' }
    });
  }
  return wallet;
};

exports.previewClaim = async (req, res) => {
  try {
    const token = String(req.query.token || '').trim();
    if (!token) {
      return res.status(400).json({ message: 'Claim token is required' });
    }

    const claim = await prisma.claim.findUnique({ where: { token } });
    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' });
    }

    const status = getClaimStatus(claim);

    console.log('[CLAIM] preview', { token, status });
    safeLogActivity({
      actorUserId: req.user?.id || null,
      actorRole: req.user?.role || null,
      action: 'claim_preview',
      entityType: 'claim',
      entityId: claim.id,
      metadata: { token, status, amount: Number(claim.amount) },
      req
    });

    res.json({
      token,
      amount: Number(claim.amount),
      status,
      expiresAt: claim.expiresAt,
      claimedAt: claim.claimedAt
    });
  } catch (error) {
    console.error('Claim preview error:', error);
    res.status(500).json({ message: 'Failed to preview claim', error: error.message });
  }
};

exports.createClaim = async (req, res) => {
  try {
    const amount = toPositiveAmount(req.body?.amount);
    if (!amount) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    let token = generateToken();
    // Basic collision retry (very unlikely)
    for (let i = 0; i < 3; i += 1) {
      const exists = await prisma.claim.findUnique({ where: { token } });
      if (!exists) break;
      token = generateToken();
    }

    const expiresAt = buildExpiry();
    const claim = await prisma.claim.create({
      data: {
        token,
        amount,
        expiresAt
      }
    });

    console.log('[CLAIM] created', { token, amount, expiresAt: claim.expiresAt });
    safeLogActivity({
      actorUserId: req.user?.id || null,
      actorRole: req.user?.role || null,
      action: 'claim_create',
      entityType: 'claim',
      entityId: claim.id,
      metadata: { token, amount, expiresAt: claim.expiresAt },
      req
    });

    res.status(201).json({
      token: claim.token,
      amount: Number(claim.amount),
      expiresAt: claim.expiresAt,
      claimId: claim.id
    });
  } catch (error) {
    console.error('Claim create error:', error);
    res.status(500).json({ message: 'Failed to create claim', error: error.message });
  }
};

exports.redeemClaim = async (req, res) => {
  try {
    const userId = req.user.id;
    const token = String(req.body?.token || '').trim();
    if (!token) {
      return res.status(400).json({ message: 'Claim token is required' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const claim = await tx.claim.findUnique({ where: { token } });
      if (!claim) {
        const error = new Error('Invalid or expired claim');
        error.status = 404;
        throw error;
      }

      const status = getClaimStatus(claim);
      if (status === 'expired') {
        const error = new Error('Claim expired');
        error.status = 410;
        throw error;
      }

      if (claim.claimedAt) {
        if (claim.claimedByUserId && claim.claimedByUserId !== userId) {
          const error = new Error('Claim already redeemed');
          error.status = 409;
          throw error;
        }

        const wallet = await ensureWallet(tx, userId);
        const transaction = await tx.transaction.findFirst({
          where: { walletId: wallet.id, referenceId: token, type: 'credit' },
          orderBy: { createdAt: 'desc' }
        });

        return { alreadyClaimed: true, wallet, transaction, claim };
      }

      const lockResult = await tx.claim.updateMany({
        where: { id: claim.id, claimedAt: null },
        data: { claimedAt: new Date(), claimedByUserId: userId }
      });

      if (!lockResult.count) {
        const latestClaim = await tx.claim.findUnique({ where: { token } });
        if (latestClaim?.claimedByUserId && latestClaim.claimedByUserId !== userId) {
          const error = new Error('Claim already redeemed');
          error.status = 409;
          throw error;
        }

        const wallet = await ensureWallet(tx, userId);
        const transaction = await tx.transaction.findFirst({
          where: { walletId: wallet.id, referenceId: token, type: 'credit' },
          orderBy: { createdAt: 'desc' }
        });

        return { alreadyClaimed: true, wallet, transaction, claim: latestClaim || claim };
      }

      const wallet = await ensureWallet(tx, userId);
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: claim.amount } }
      });

      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'credit',
          amount: claim.amount,
          category: 'cashback_payout',
          status: 'success',
          description: 'QR claim reward',
          referenceId: token
        }
      });

      return { alreadyClaimed: false, wallet: updatedWallet, transaction, claim };
    });

    console.log('[CLAIM] redeemed', { token, userId, alreadyClaimed: result.alreadyClaimed });
    safeLogActivity({
      actorUserId: userId,
      actorRole: req.user?.role,
      action: 'claim_redeem',
      entityType: 'claim',
      entityId: result?.claim?.id,
      metadata: {
        token,
        amount: Number(result?.transaction?.amount || result?.claim?.amount || 0),
        alreadyClaimed: result.alreadyClaimed
      },
      req
    });

    res.json({
      success: true,
      status: result.alreadyClaimed ? 'claimed' : 'redeemed',
      amount: Number(result?.transaction?.amount || result?.claim?.amount || 0),
      wallet: {
        balance: Number(result.wallet.balance),
        currency: result.wallet.currency
      },
      transaction: result.transaction
        ? {
          id: result.transaction.id,
          type: result.transaction.type,
          amount: Number(result.transaction.amount),
          category: result.transaction.category,
          status: result.transaction.status,
          description: result.transaction.description,
          referenceId: result.transaction.referenceId,
          createdAt: result.transaction.createdAt
        }
        : null
    });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ message: error.message || 'Claim redemption failed' });
  }
};
