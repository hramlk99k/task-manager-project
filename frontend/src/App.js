// App.js (Task Manager Frontend)

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api'; // Base URL for both auth and tasks

function App() {
    // STATE: Hold the JWT token. Null means logged out.
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    
    // STATE: Determines which Auth view to show: 'login' or 'register'
    const [isLoginView, setIsLoginView] = useState(true); 

    // STATE: Input data for Login/Register forms
    const [authData, setAuthData] = useState({ email: '', password: '' });

    // STATE: Task Management
    const [tasks, setTasks] = useState([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [authError, setAuthError] = useState('');

    // --- AUTH UTILITIES ---

    // 💡 HELPER: Function to create the necessary Axios config with the current token
    const getConfig = () => ({
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const handleAuthChange = (e) => {
        setAuthData({ ...authData, [e.target.name]: e.target.value });
        setAuthError('');
    };

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        const endpoint = isLoginView ? '/auth/login' : '/auth/register';
        setAuthError('');

        try {
            // Note: Login/Register do not require the token, so we use plain axios
            const response = await axios.post(`${API_URL}${endpoint}`, authData);
            
            // Success: Store the token and update state
            const newToken = response.data.token;
            localStorage.setItem('token', newToken);
            setToken(newToken);
            setAuthData({ email: '', password: '' });
            
        } catch (error) {
            const msg = error.response?.data?.message || 'Authentication failed.';
            setAuthError(msg);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setTasks([]);
    };

    // --- TASK CRUD FUNCTIONS ---

    // READ: Fetch all tasks for the logged-in user
    const fetchTasks = async () => {
        if (!token) return;
        try {
            // 🔑 CORRECTED: Using the latest token value via getConfig()
            const response = await axios.get(`${API_URL}/tasks`, getConfig());
            setTasks(response.data);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            if (error.response?.status === 401) {
                handleLogout(); // Log out if token is invalid/expired
            }
        }
    };

    // CREATE: Add a new task
    const addTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        try {
            // 🔑 CORRECTED: Using the latest token value via getConfig()
            await axios.post(`${API_URL}/tasks`, { title: newTaskTitle }, getConfig());
            setNewTaskTitle('');
            fetchTasks(); // Refresh list
        } catch (error) {
            console.error('Error adding task:', error);
        }
    };

    // UPDATE: Toggle task completion status
    const toggleTask = async (id, completed) => {
        try {
            // 🔑 CORRECTED: Using the latest token value via getConfig()
            await axios.patch(`${API_URL}/tasks/${id}`, { completed: !completed }, getConfig());
            fetchTasks(); // Refresh list
        } catch (error) {
            console.error('Error toggling task:', error);
        }
    };

    // DELETE: Remove a task
    const deleteTask = async (id) => {
        try {
            // 🔑 CORRECTED: Using the latest token value via getConfig()
            await axios.delete(`${API_URL}/tasks/${id}`, getConfig());
            fetchTasks(); // Refresh list
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    // --- LIFECYCLE HOOK ---
    // Fetch tasks whenever the token changes (i.e., when user logs in/out)
    useEffect(() => {
        if (token) {
            fetchTasks();
        }
    }, [token]);

    // --- RENDERING ---

    // If there is no token, show the Authentication screens
    if (!token) {
        return (
            <div style={styles.container}>
                <h2>{isLoginView ? 'Login' : 'Register'} to Task Manager</h2>
                <form onSubmit={handleAuthSubmit} style={styles.form}>
                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={authData.email}
                        onChange={handleAuthChange}
                        style={styles.input}
                        required
                    />
                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={authData.password}
                        onChange={handleAuthChange}
                        style={styles.input}
                        required
                    />
                    <button type="submit" style={styles.button}>
                        {isLoginView ? 'Login' : 'Register'}
                    </button>
                </form>
                {authError && <p style={{ color: 'red' }}>{authError}</p>}
                <p style={styles.switchText}>
                    {isLoginView ? "Don't have an account?" : "Already have an account?"}{' '}
                    <button onClick={() => setIsLoginView(!isLoginView)} style={styles.linkButton}>
                        {isLoginView ? 'Register here' : 'Login here'}
                    </button>
                </p>
            </div>
        );
    }

    // If a token exists, show the Task Manager interface
    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1>Task Manager</h1>
                <button onClick={handleLogout} style={{ ...styles.button, backgroundColor: '#f44336' }}>
                    Logout
                </button>
            </div>

            {/* Task Creation Form */}
            <form onSubmit={addTask} style={{ ...styles.form, marginBottom: '20px' }}>
                <input
                    type="text"
                    placeholder="New task title..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    style={{ ...styles.input, flexGrow: 1 }}
                    required
                />
                <button type="submit" style={styles.button}>Add Task</button>
            </form>

            {/* Task List */}
            <ul style={styles.ul}>
                {tasks.map(task => (
                    <li key={task._id} style={styles.li}>
                        <div
                            onClick={() => toggleTask(task._id, task.completed)}
                            style={{ 
                                textDecoration: task.completed ? 'line-through' : 'none',
                                cursor: 'pointer',
                                flexGrow: 1 
                            }}>
                            {task.title}
                        </div>
                        <button 
                            onClick={() => deleteTask(task._id)}
                            style={{ ...styles.button, backgroundColor: '#f44336', padding: '5px 10px' }}>
                            Delete
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// Simple inline styles for clarity (use CSS modules in a real project)
const styles = {
    container: { padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: 'auto', border: '1px solid #ccc', borderRadius: '8px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    form: { display: 'flex', flexDirection: 'column', gap: '10px' },
    input: { padding: '10px', border: '1px solid #ccc', borderRadius: '4px' },
    button: { padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    switchText: { textAlign: 'center', marginTop: '15px' },
    linkButton: { background: 'none', border: 'none', color: '#2196F3', cursor: 'pointer', padding: 0, textDecoration: 'underline' },
    ul: { listStyleType: 'none', padding: 0 },
    li: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eee' },
};

export default App;