// task-service/src/routes/tasks.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { publishTaskEvent } = require('../utils/sqs');
const router = express.Router();

// Middleware to verify token and get user
const getUserFromToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

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

// Get all tasks for current user
router.get('/', getUserFromToken, async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = req.supabase
      .from('tasks')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ tasks: data || [] });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get single task
router.get('/:id', getUserFromToken, async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Task not found' });
      }
      throw error;
    }

    res.json({ task: data });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create task
router.post('/', getUserFromToken, async (req, res) => {
  try {
    const { title, description, status = 'pending' } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Create task in Supabase
    const { data, error } = await req.supabase
      .from('tasks')
      .insert({
        user_id: req.user.id,
        title,
        description,
        status
      })
      .select()
      .single();

    if (error) throw error;

    // Publish event to SQS
    try {
      await publishTaskEvent('task.created', data, req.user.id);
    } catch (sqsError) {
      console.error('Failed to publish event, but task created:', sqsError);
    }

    res.status(201).json({
      message: 'Task created successfully',
      task: data
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', getUserFromToken, async (req, res) => {
  try {
    const { title, description, status } = req.body;
    
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) {
      if (!['pending', 'in_progress', 'completed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await req.supabase
      .from('tasks')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Task not found' });
      }
      throw error;
    }

    // Publish event to SQS
    try {
      await publishTaskEvent('task.updated', data, req.user.id);
    } catch (sqsError) {
      console.error('Failed to publish event:', sqsError);
    }

    res.json({
      message: 'Task updated successfully',
      task: data
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
router.delete('/:id', getUserFromToken, async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('tasks')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Task not found' });
      }
      throw error;
    }

    // Publish event to SQS
    try {
      await publishTaskEvent('task.deleted', data, req.user.id);
    } catch (sqsError) {
      console.error('Failed to publish event:', sqsError);
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;