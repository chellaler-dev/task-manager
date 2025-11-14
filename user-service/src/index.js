require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.USER_SERVICE_PORT || 3001;

app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'user-service' });
});

// Auth routes
app.use('/auth', authRoutes);

// Get current user profile
app.get('/users/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.user_metadata.name,
      created_at: user.created_at
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('User service error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`👤 User Service running on port ${PORT}`);
});