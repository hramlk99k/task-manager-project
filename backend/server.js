// server.js (Complete MERN Task Manager Backend with Authentication)

// --- 1. Load Environment Variables First ---
require('dotenv').config(); 

// --- 2. Import Dependencies ---
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken'); 
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 5000; 

// --- 3. Use Environment Variables ---
// These are defined in your .env file
const MONGO_URI = process.env.MONGO_URI; 
const JWT_SECRET = process.env.JWT_SECRET; 

// Middleware
app.use(express.json()); // To parse JSON bodies
app.use(cors());         // To allow frontend (Port 3000) to communicate

// --- 4. Database Connection ---
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected to taskManagerDB...'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));


// --- 5. Define Schemas and Models ---
const { Schema } = mongoose; 

// A. User Model (for Authentication)
const UserSchema = new Schema({
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true }
}, { timestamps: true });
const User = mongoose.model('User', UserSchema);

// B. Task Model (Linked to User)
const TaskSchema = new Schema({
    title: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
    user: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    }
}, { timestamps: true });
const Task = mongoose.model('Task', TaskSchema);


// --- 6. Auth Middleware ---
// This function checks for a valid JWT before allowing access to protected routes.
const authMiddleware = (req, res, next) => {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ message: 'Authorization header missing' });
    }

    // Expected format: "Bearer [token]"
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        // Verify the token using the secret key
        const decoded = jwt.verify(token, JWT_SECRET);
        // Attach the authenticated user's ID to the request object
        req.user = decoded.userId; 
        next(); // Proceed to the actual route handler
    } catch (e) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};


// --- 7. API Routes ---

// A. AUTH ROUTES (Not protected)

// POST /api/auth/register: Create new user
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists' });

        user = new User({ email, password });
        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        // Generate token and send it back
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' }); 
        res.status(201).json({ token });
    } catch (err) {
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// POST /api/auth/login: Authenticate user
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid Credentials' });

        // Compare password with hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid Credentials' });

        // Generate token and send it back
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (err) {
        res.status(500).json({ message: 'Server error during login' });
    }
});

// B. PROTECTED TASK ROUTES (Requires authMiddleware)

// GET /api/tasks: Read all tasks for the logged-in user (READ)
app.get('/api/tasks', authMiddleware, async (req, res) => {
    try {
        // Only return tasks linked to the user ID provided by the token (req.user)
        const tasks = await Task.find({ user: req.user }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching tasks' });
    }
});

// POST /api/tasks: Create a new task (CREATE)
app.post('/api/tasks', authMiddleware, async (req, res) => {
    try {
        const newTask = new Task({
            title: req.body.title,
            user: req.user // Assign user ID from the token
        });

        const task = await newTask.save();
        res.status(201).json(task);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PATCH /api/tasks/:id: Update task status/title (UPDATE)
app.patch('/api/tasks/:id', authMiddleware, async (req, res) => {
    try {
        const task = await Task.findOneAndUpdate(
            // Find by ID AND ensure ownership
            { _id: req.params.id, user: req.user }, 
            req.body,
            { new: true, runValidators: true }
        );

        if (!task) {
            return res.status(404).json({ message: 'Task not found or unauthorized' }); 
        }
        res.json(task);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE /api/tasks/:id: Delete a task (DELETE)
app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
    try {
        // Find by ID AND ensure ownership
        const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user }); 

        if (!task) {
            return res.status(404).json({ message: 'Task not found or unauthorized' }); 
        }
        res.json({ message: 'Task deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// --- 8. Start the Server ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});