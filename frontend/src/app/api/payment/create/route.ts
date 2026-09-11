import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(req: Request) {
  try {
    const { amount } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ detail: 'Invalid amount' }, { status: 400 });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      // Mock order for testing if keys are missing
      return NextResponse.json({ order_id: `order_mock_${Date.now()}` });
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: Math.round(amount * 100), // Convert to subunits (e.g., paise)
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`
    };

    const order = await instance.orders.create(options);

    return NextResponse.json({ order_id: order.id });
  } catch (error: any) {
    console.error('Razorpay Create Error:', error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
