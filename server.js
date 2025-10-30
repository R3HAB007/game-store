// Simple Express backend for GameStore (mock + razorpay example placeholders)
const express = require('express');
const app = express();
const crypto = require('crypto');
const cors = require('cors');
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Mock product DB (in production, use real DB)
const PRODUCTS = [
  {id:1,title:'RacerX: Neon Nights',price:499,genre:'Racing',tags:['Singleplayer','Arcade'],rating:4.5,cover:'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=aa6e5bd9c3c7b1f3e8a6e2fb3f13a6b8'},
  {id:2,title:'CyberQuest: Origins',price:799,genre:'Action',tags:['Multiplayer','Sci-Fi'],rating:4.7,cover:'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=0e3a7c0b6f3b2e9b7c4a4d9b2a3a6c6c'}
];

// simple in-memory orders store (demo only)
const ORDERS = {};

// GET /api/products
app.get('/api/products', (req, res) => {
  res.json(PRODUCTS);
});

// POST /api/create-order  -> create a mock order or Razorpay order server-side
app.post('/api/create-order', (req, res) => {
  const {items, customer} = req.body || {};
  if(!items || !items.length) return res.status(400).json({error:'No items'});
  const amount = items.reduce((s,i)=>s + (i.price * i.qty), 0);
  // In production, create an order via Razorpay/Cashfree SDK using secret keys.
  // Here we return a mock order id and store it.
  const orderId = 'order_' + Date.now();
  ORDERS[orderId] = {items, customer, amount, status:'created'};
  res.json({orderId, amount, currency:'INR', provider:'mock'});
});

// POST /api/webhook  -> verify signature for Razorpay (example)
// For demo, we verify a header 'x-demo-signature' with a shared secret in .env (DEMO_WEBHOOK_SECRET)
app.post('/api/webhook', (req, res) => {
  const secret = process.env.DEMO_WEBHOOK_SECRET || 'demo_secret';
  const signature = req.headers['x-demo-signature'] || '';
  const payload = JSON.stringify(req.body);
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  if(signature !== expected) {
    console.warn('Invalid webhook signature');
    return res.status(401).json({error:'invalid signature'});
  }
  // process event
  const {orderId, status} = req.body || {};
  if(orderId && ORDERS[orderId]) ORDERS[orderId].status = status || 'paid';
  // respond OK
  res.json({ok:true});
});

// GET /download/:token -> demo signed url flow (token -> verify -> redirect to file)
// In production generate signed S3 URLs tied to order and expiry.
app.get('/download/:token', (req, res) => {
  const token = req.params.token || '';
  // Very simple demo: token is orderId; verify order exists and is paid
  const order = ORDERS[token];
  if(!order) return res.status(404).send('Invalid token');
  if(order.status !== 'paid') return res.status(403).send('Order not paid');
  // In a real app, generate a signed S3 URL here. For demo, send a JSON with info.
  res.json({downloadUrls: order.items.map(i=>({title:i.title,url:'https://example.com/downloads/'+encodeURIComponent(i.title)}))});
});

app.listen(PORT, ()=>console.log('GameStore backend listening on port',PORT));