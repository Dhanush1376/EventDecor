import User from '../../models/User';
import Product from '../../models/Product';
import TeamInvite from '../../models/TeamInvite';
import ApiError from '../../utils/ApiError';
import { STAFF_ROLES, canActorAssignRole } from '../../config/adminConfig';
import { canonicalizeEmail } from '../../utils/email/emailHelper';
import crypto from 'crypto';
import { sendEmail } from '../../utils/email/sendEmail';
import { getFrontendUrl } from '../../utils/getFrontendUrl';
import { getTeamInviteEmailTemplate } from '../../utils/email/emailTemplates';

export class UserService {
  static async updateUserRole(targetUserId: string, newRole: string, actorRole: string) {
    if (newRole !== 'user' && newRole !== 'customer' && !STAFF_ROLES.includes(newRole as any)) {
      throw new ApiError(400, 'Invalid role assignment requested');
    }

    if (!canActorAssignRole(actorRole, newRole)) {
      throw new ApiError(
        403,
        `Access denied. Your current role (${actorRole}) does not have sufficient clearance to assign the '${newRole}' role.`,
      );
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) throw new ApiError(404, 'User not found');

    const targetRole = targetUser.role;
    if (
      targetRole === 'owner' ||
      (!canActorAssignRole(actorRole, targetRole) && actorRole !== 'owner')
    ) {
      throw new ApiError(
        403,
        'Access denied. You cannot modify the role of a user with equal or higher privileges.',
      );
    }

    const user = await User.findByIdAndUpdate(
      targetUserId,
      { role: newRole },
      { returnDocument: 'after' },
    );
    if (!user) throw new ApiError(404, 'User not found');
    return user;
  }

  static async computeAndValidateCart(user: any) {
    const validatedCart = [];
    let cartChanged = false;

    const rawCart = Array.isArray(user.cart) ? user.cart : [];
    const productIds = Array.from(
      new Set<string>(rawCart.map((item: any) => String(item.product)).filter(Boolean)),
    );
    const products = await Product.find({ _id: { $in: productIds } });
    const productsById = new Map(products.map((product: any) => [product._id.toString(), product]));

    const aggregatedCartMap = new Map<string, any>();

    for (const item of rawCart) {
      if (!item.product) continue;
      const product = productsById.get(String(item.product));
      if (!product || !product.isActive) {
        cartChanged = true;
        continue;
      }

      const itemType = item.type || 'purchase';
      let quantity = Number(item.quantity) || 0;

      if (quantity <= 0) {
        cartChanged = true;
        continue;
      }

      const key = `${item.product}_${itemType}_${item.variant || 'Default'}_${JSON.stringify(item.rentalInfo || {})}`;

      if (aggregatedCartMap.has(key)) {
        cartChanged = true;
        const existing = aggregatedCartMap.get(key);
        existing.quantity += quantity;
      } else {
        aggregatedCartMap.set(key, {
          product: product,
          quantity,
          variant: item.variant || 'Default',
          type: itemType,
          rentalInfo: item.rentalInfo,
        });
      }
    }

    for (const item of aggregatedCartMap.values()) {
      if (item.quantity > 50) {
        item.quantity = 50;
        cartChanged = true;
      }
      if (item.quantity > item.product.stock) {
        item.quantity = item.product.stock;
        cartChanged = true;
      }

      if (item.quantity > 0) {
        validatedCart.push(item);
      } else {
        cartChanged = true;
      }
    }

    if (cartChanged) {
      user.cart = validatedCart.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
        variant: item.variant,
        type: item.type,
        rentalInfo: item.rentalInfo,
      }));
      await User.findOneAndUpdate({ _id: user._id }, { $set: { cart: user.cart } });
    }

    const computeSummary = (items: any[], isRental: boolean) => {
      let subtotal = 0;
      let depositTotal = 0;

      items.forEach((item) => {
        let itemPrice = item.product.price;

        if (isRental && item.rentalInfo?.startDate && item.rentalInfo?.endDate) {
          const start = new Date(item.rentalInfo.startDate);
          const end = new Date(item.rentalInfo.endDate);
          const diffDays =
            Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;

          if (item.product.rentalPricing) {
            if (diffDays >= 30 && item.product.rentalPricing.monthly > 0) {
              itemPrice = (item.product.rentalPricing.monthly / 30) * diffDays;
            } else if (diffDays >= 7 && item.product.rentalPricing.weekly > 0) {
              itemPrice = (item.product.rentalPricing.weekly / 7) * diffDays;
            } else if (item.product.rentalPricing.daily > 0) {
              itemPrice = item.product.rentalPricing.daily * diffDays;
            }
          }
          depositTotal += (item.product.securityDeposit || 0) * item.quantity;
        }

        subtotal += itemPrice * item.quantity;
      });

      const shippingFee = subtotal > 2000 || subtotal === 0 ? 0 : 100;
      const platformFee = 0;
      const discount = 0;
      const total = subtotal + shippingFee + depositTotal - discount;

      return {
        subtotal,
        depositTotal,
        shippingFee,
        platformFee,
        discount,
        total,
      };
    };

    const purchaseItems = validatedCart.filter((item) => item.type === 'purchase');
    const rentalItems = validatedCart.filter((item) => item.type === 'rental');

    return {
      purchaseCart: {
        items: purchaseItems,
        summary: computeSummary(purchaseItems, false),
      },
      rentalCart: {
        items: rentalItems,
        summary: computeSummary(rentalItems, true),
      },
    };
  }

  static async inviteTeamMember(
    email: string,
    role: string,
    permissions: string,
    inviterId: string,
  ) {
    const cleanEmail = canonicalizeEmail(email);

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser && ['admin', 'manager', 'coordinator'].includes(existingUser.role as any)) {
      throw new ApiError(400, 'This user is already a registered team member');
    }

    await TeamInvite.deleteMany({ email: cleanEmail, status: 'pending' }, {
      bypassDestructionGuard: true,
    } as any);

    const token = crypto.randomBytes(32).toString('hex');
    const invite = await TeamInvite.create({
      email: cleanEmail,
      role: role as any,
      permissions: permissions || 'Full Access',
      token,
      invitedBy: inviterId,
    });

    const frontendUrl = getFrontendUrl();
    const acceptUrl = `${frontendUrl}/accept-invite?token=${token}`;
    const emailHtml = getTeamInviteEmailTemplate(acceptUrl, role, permissions || 'Full Access');

    await sendEmail({
      email: cleanEmail,
      subject: 'Invitation to join Siri Arts & Crafts Admin Team',
      message: `You are invited to join the Siri Arts & Crafts team as an ${role}. Visit here to accept: ${acceptUrl}`,
      html: emailHtml,
    });

    return invite;
  }
}
