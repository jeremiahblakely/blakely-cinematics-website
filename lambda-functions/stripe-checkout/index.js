// Stripe Checkout Lambda Function
// Created: September 7, 2025
// Purpose: Handle Stripe checkout session creation for Blakely Cinematics

const Stripe = require('stripe');

// Initialize Stripe with your secret key (from environment variable)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// CORS headers for response
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  console.log('Checkout request received:', JSON.stringify(event, null, 2));
  
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' })
    };
  }
  
  try {
    // Parse request body
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    
    // Extract parameters
    const {
      name,
      email,
      package: packageType,
      amount,
      currency = 'usd',
      successUrl,
      cancelUrl,
      metadata = {}
    } = body;
    
    // Validate required fields
    if (!email || !amount) {
      throw new Error('Missing required fields: email and amount');
    }
    
    // Package descriptions
    const packageDescriptions = {
      'deposit': 'Session Deposit',
      'signature': 'Signature Photography Session',
      'headshot': 'Professional Headshot Session',
      'creative': 'Creative Photography Session'
    };
    
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      client_reference_id: `${Date.now()}-${packageType}`,
      metadata: {
        ...metadata,
        clientName: name,
        package: packageType,
        timestamp: new Date().toISOString()
      },
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: packageDescriptions[packageType] || 'Photography Session',
              description: `Booking for ${name}`,
              metadata: {
                package: packageType
              }
            },
            unit_amount: amount
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: successUrl || 'https://blakelycinematics.com/booking-success',
      cancel_url: cancelUrl || 'https://blakelycinematics.com/booking'
    });
    
    console.log('Checkout session created:', session.id);
    
    // Return session details
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        sessionId: session.id,
        url: session.url,
        message: 'Checkout session created successfully'
      })
    };
    
  } catch (error) {
    console.error('Checkout error:', error);
    
    // Return error response
    return {
      statusCode: error.statusCode || 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        type: error.type || 'checkout_error'
      })
    };
  }
};
