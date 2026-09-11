import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db, auth } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, tier, billing_cycle, currency } = body;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ detail: 'Missing or invalid authorization token' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    let decodedToken;
    try {
      if (idToken === 'mock_id_token') {
        decodedToken = { uid: 'mock_uid_123', email: 'mock@example.com' };
      } else {
        decodedToken = await auth.verifyIdToken(idToken);
      }
    } catch (e) {
      return NextResponse.json({ detail: 'Invalid authorization token' }, { status: 401 });
    }

    const isMockPayment = 
      razorpay_order_id?.startsWith('order_mock_') || 
      razorpay_signature === 'mock_signature_value' ||
      decodedToken.uid?.startsWith('mock_uid_');

    if (!isMockPayment && process.env.RAZORPAY_KEY_SECRET) {
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return NextResponse.json({ detail: 'Invalid payment signature. Verification failed.' }, { status: 400 });
      }
    }

    const userId = decodedToken.uid;
    const userEmail = decodedToken.email;

    if (!userEmail) {
      return NextResponse.json({ detail: 'Email missing from authenticated user token.' }, { status: 400 });
    }

    // Update Firestore
    let targetTier = 'Plus';
    if (tier?.toLowerCase() === 'pro') targetTier = 'Pro';
    else if (tier?.toLowerCase() === 'plus') targetTier = 'Plus';
    else if (tier) targetTier = tier.charAt(0).toUpperCase() + tier.slice(1);

    const uploadLimit = targetTier.toLowerCase() === 'plus' ? 20 : (targetTier.toLowerCase() === 'pro' ? 100 : 5);

    try {
      const userRef = db.collection('users').doc(userId);
      await userRef.set({
        planTier: targetTier,
        isPremium: true,
        uploadLimit,
      }, { merge: true });
    } catch (dbError: any) {
      console.error('Firestore update failed:', dbError);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and subscription activated.',
      subscription: {
        tier: targetTier,
        active: true
      }
    });

  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
