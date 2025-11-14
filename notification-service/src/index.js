require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { startConsumer } = require('./workers/sqsConsumer');

const app = express();
const PORT = process.env.NOTIFICATION_SERVICE_PORT || 3003;

app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware to verify token
const getUserFromToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    req.supabase = supabase;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'notification-service' });
});

// Get all notifications for user
app.get('/notifications', getUserFromToken, async (req, res) => {
  try {
    const { read } = req.query;
    
    let query = req.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (read !== undefined) {
      query = query.eq('read', read === 'true');
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ notifications: data || [] });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
app.put('/notifications/:id/read', getUserFromToken, async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Notification not found' });
      }
      throw error;
    }

    res.json({
      message: 'Notification marked as read',
      notification: data
    });
  } catch (error) {
    console.error('Update notification error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Get unread count
app.get('/notifications/unread/count', getUserFromToken, async (req, res) => {
  try {
    const { count, error } = await req.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('read', false);

    if (error) throw error;

    res.json({ unread_count: count || 0 });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Notification service error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🔔 Notification Service running on port ${PORT}`);
});

// Start SQS consumer
startConsumer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});